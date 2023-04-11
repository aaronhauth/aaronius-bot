import * as dotenv from 'dotenv' // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
dotenv.config()
console.log(process.env);
import express from 'express';
import https from 'https';
import { RefreshingAuthProvider, StaticAuthProvider } from '@twurple/auth';
import { ChatClient } from '@twurple/chat';
import { PubSubClient } from '@twurple/pubsub';
import { dbClient } from './db.js';



const app = express();
const port = process.env.PORT
console.log(`set port to ${port}`);
const clientId = process.env.aaroniusBotClientId;
const botSecret = 'kms0af0s4pvn7h5fuxa5xxa6njm2xk';

const db = new dbClient();

// init bot tokens
const botTokenRow = await db.getAccessToken('botAccessToken');
const botAccessToken = botTokenRow[0].access_token;
const botRefreshToken = process.env.botRefreshToken;

// init pubsub tokens
const psTokenRow = await db.getAccessToken('psAccessToken');
const psUserAccessToken = psTokenRow[0].access_token;
const psUserRefreshToken = process.env.psUserRefreshToken;

const authProvider = new RefreshingAuthProvider({clientId: clientId, clientSecret: botSecret, onRefresh: async token => {
    await db.updateAccessToken('botAccessToken', token.accessToken);
}}, {accessToken: botAccessToken, refreshToken: botRefreshToken, expiresIn:0, scope:['chat:read', 'chat:edit']});
const psAuthProvider = new RefreshingAuthProvider({clientId: clientId, clientSecret: botSecret, onRefresh: async token => {
    await db.updateAccessToken('psAccessToken', token.accessToken);
}}, {accessToken: psUserAccessToken, refreshToken: psUserRefreshToken, expiresIn:0, scope:['channel:read:redemptions']});


console.log('in main')
const chatClient = new ChatClient({ authProvider, channels: ['aaroniush'] });
console.log('connecting');
await chatClient.connect();

chatClient.onMessage((channel, user, text) => {
    console.log(text);
    if (text.startsWith('!ping')){
        chatClient.say(channel, 'pong!');
    }
})

const ps = new PubSubClient();
await ps.registerUserListener(psAuthProvider, process.env.userId);
await ps.onRedemption(process.env.userId, redemption => {
    console.log(`Redeemed ${redemption.rewardTitle} with id ${redemption.rewardId}`);


        if (redemption.rewardId === '68778a6a-14ee-4e10-a1e8-2f95094641d3') {
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
                if (redemption.channelId) {
                    chatClient.say('aaroniush', json.joke);
                    chatClient.say('aaroniush', `you can thank @${redemption.userDisplayName} for that one.`);
                }
            })
        });
    } else if (redemption.rewardId !== '8bfd8f73-7068-422d-89e8-408fd3102d89' && redemption.rewardId !== 'c1e0dd1a-8f95-4807-98dc-c69364bc4872') {

        // if we're able to send messages at the moment outside of the context of 
        let redeemMessage = `/me @${redemption.userDisplayName} redeemed ${redemption.rewardTitle}`;
        redeemMessage += redemption.rewardPrompt ? ` with message ${redemption.rewardPrompt}` : ".";
        if (redemption) {
            chatClient.say('aaroniush', redeemMessage);
        }
    }


})

console.log(ps.isConnected);

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

    ps.onRedemption(process.env.userId, redemption => {
        console.log('processing redemption ' + redemption.rewardTitle + ' with id ' + redemption.rewardId);
        if (redemption.rewardId === '8bfd8f73-7068-422d-89e8-408fd3102d89') {
            console.log(`sending 'nice' from ${redemption.userDisplayName}`);
            res.write('data: ' + `{"name": "${redemption.userDisplayName}", "type": "nice"}` + '\n\n');
        } else if (redemption.rewardId === 'c1e0dd1a-8f95-4807-98dc-c69364bc4872') {
            console.log(`sending 'VERY nice' from ${redemption.userDisplayName}`);
            res.write('data: ' + `{"name": "${redemption.userDisplayName}", "type": "veryNice"}` + '\n\n');
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
