const express = require('express');
const https = require('https');
const twitchPs = require('twitchps');
const { runInNewContext } = require('vm');
const tmi = require('tmi.js');
const app = express();
const port = process.env.PORT

// chatbot options
const opts = {
    identity: {
        username: process.env.userName,
        password: process.env.token2
    },
    channels: [
        process.env.userName
    ]
}

// create a client with our options
const chatClient = new tmi.client(opts);
let chatTarget = null;
// this chat client really only works in the context of a single channel (mine, at the moment)
// we initialize our chatTarget so that our redemption bot can have a channel to send our messages to. Otherwise, we don't care too much about this thing here.
chatClient.on('message', (target, context, msg, self) => {
    // things to do when a message sends
    if (!chatTarget) chatTarget = target;
    if (self) return;
});
chatClient.on('connected', (addr, port) => {
    console.log(`* Connected to ${addr}:${port}`);
});

chatClient.connect();

let init_topics = [{topic: `video-playback.${process.env.userName}`}, {topic: `channel-points-channel-v1.${process.env.userId}`,  token: `${process.env.token}`}];
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
            res.write('data: ' + data.redemption.user.display_name + '\n\n');
        } else {
            // if we're able to send messages at the moment outside of the context of 
            let redeemMessage = `/me @${data.redemption.user.display_name} redeemed ${data.reward.title}`;
            redeemMessage += data.reward.is_user_input_required ? ` with message ${data.user_input}` : ".";
            if (chatTarget) {
                chatClient.say(chatTarget, redeemMessage);
            }
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

app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`))
