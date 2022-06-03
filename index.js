import {unified} from 'unified'
import * as stream from 'unified-stream'
import retextEnglish from 'retext-english'
import retextStringify from 'retext-stringify'
import retextEmoji from 'retext-emoji'
import retextPos from 'retext-pos';
import ussyfy from './ussify.js';

import express from 'express';
import https from 'https';
import * as tmi from 'tmi.js';
import twitchPs from 'twitchps';

const app = express();
const port = process.env.PORT
const ussyBotMessageFrequency = Number(process.env.ussyBotMessageFrequency);
const ussifiedWordFrequency = Number(process.env.ussifiedWordFrequency);

// chatbot options
const opts = {
    options: {debug: true, messagesLogLevel: 'info'},
    connection: {
        reconnect: true,
        secure: true
    },
    identity: {
        username: process.env.botName,
        password: 'oauth:' + process.env.chatBotToken
    },
    channels: [
        process.env.channelUserName
    ]
}

console.log(opts);

// create a client with our options
const chatClient = new tmi.client(opts);
chatClient.connect().catch(console.error);
let channel = process.env.channelUserName;

const processor = unified()
  .use(retextEnglish)
  .use(retextPos)
  .use(ussyfy, {frequency: ussifiedWordFrequency})
  .use(retextStringify);

// this chat client really only works in the context of a single channel (mine, at the moment)
// we initialize our chatTarget so that our redemption bot can have a channel to send our messages to. Otherwise, we don't care too much about this thing here.
chatClient.on('message', (target, tags, msg, self) => {
    if (self) return;

    // if we hit the odds of ussyfying a word:
    if (Math.floor(Math.random()*ussyBotMessageFrequency) === 0) {

        // use the processing stream to ussify the message.
        const processResult = processor.processSync(msg);
        chatClient.say(target, processResult.value);
    } 

});


let init_topics = [{topic: `video-playback.${process.env.channelUserName}`}, {topic: `channel-points-channel-v1.${process.env.userId}`,  token: `${process.env.pubSubToken}`}];
var ps = new twitchPs({reconnect: false, init_topics: init_topics, debug: true});
console.log(process.env.PORT);

app.get('/', (req, res) => res.send('Hello World'));
app.get('/cat-facts/', (req, res) => {
    https.get('https://cat-fact.herokuapp.com/facts/random/', (resp) => {
        let data = '';
        resp.on('data', chunk => {
            data += chunk;
        });
        resp.on('end', () => {
            const json = JSON.parse(data)
            res.send(json.text);
        })
    });

}); 
app.get('/ping', (req, res) => {
    res.end();
})
app.get('/nice', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('connection', 'keep-alive');
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.flushHeaders(); // flush the headers to establish SSE with client

    ps.on('channel-points', (data) => {
        console.log('processing redemption ' + data.reward.title + ' with id ' + data.reward.id);
        if (data.reward.id === '8bfd8f73-7068-422d-89e8-408fd3102d89') {
            console.log(`sending 'nice' from ${data.redemption.user.display_name}`);
            res.write('data: ' + `{"name": "${data.redemption.user.display_name}", "type": "nice"}` + '\n\n');
        } else if (data.reward.id === 'c1e0dd1a-8f95-4807-98dc-c69364bc4872') {
            console.log(`sending 'VERY nice' from ${data.redemption.user.display_name}`);
            res.write('data: ' + `{"name": "${data.redemption.user.display_name}", "type": "veryNice"}` + '\n\n');
        }
    });

    var interval = setInterval(() => {
        console.log('sending ping');
        res.write('data: ++ping++\n\n');
    }, 50000)
    
    res.on('close', () => {
        console.log('client dropped me');
        res.end();
        clearInterval(interval);
    });

    res.on('error', err => {
        console.log(err);
        res.end();
        clearInterval(interval);
    });

    
});

// these are just standard channel point redemptions i want my bot to process. Might just be api calls and stuff...
ps.on('channel-points', (event) => {
    console.log(event.reward.id);
    if (event.reward.id === '68778a6a-14ee-4e10-a1e8-2f95094641d3') {
        console.log('starting request for a dad joke')
        const options = {
            host: 'icanhazdadjoke.com',
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'AaroniusH twitch bot'
            }
        }
        https.get(options, (resp) => {
            let data = '';
            resp.on('data', chunk => {
                data += chunk;
            });
            resp.on('end', () => {
                console.log(data)
                const json = JSON.parse(data)
                if (channel) {
                    chatClient.say(channel, json.joke);
                    chatClient.say(channel, `you can thank @${event.redemption.user.display_name} for that one.`);
                }
            })
        });
    } else if (event.reward.id !== '8bfd8f73-7068-422d-89e8-408fd3102d89' && event.reward.id !== 'c1e0dd1a-8f95-4807-98dc-c69364bc4872') {

        // if we're able to send messages at the moment outside of the context of 
        let redeemMessage = `/me @${event.redemption.user.display_name} redeemed ${event.reward.title}`;
        redeemMessage += event.reward.is_user_input_required ? ` with message ${event.user_input}` : ".";
        if (channel) {
            chatClient.say(channel, redeemMessage);
        }
    }
})

app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`))
