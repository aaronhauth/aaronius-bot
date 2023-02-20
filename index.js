import express from 'express';
import https from 'https';
import { RefreshingAuthProvider, StaticAuthProvider } from '@twurple/auth';
import { ChatClient } from '@twurple/chat';
import { PubSubClient } from '@twurple/pubsub';

const app = express();
const port = process.env.PORT
console.log(`set port to ${port}`);
const clientId = '64lpbdqq4o9x52bspi3jje00ag7o6d';
const botSecret = 'kms0af0s4pvn7h5fuxa5xxa6njm2xk';

const botAccessToken = '8vtxgocptpma1k05mgx63schg4fvbq';
const botRefreshToken = 'iagr79mesnzpbn1s5jih89ctthwakslhyzlhrvr4m5y8ypxuib';

const psUserAccessToken = 'gjhvhlvexeo2j5y7aby1q9vsmaoh3r';
const psUserRefreshToken = 'vhcq9cgm91nk7x10bl9oomvtiakgzf5ymigqbxozpmrjm8nuii';

const authProvider = new RefreshingAuthProvider({clientId: clientId, clientSecret: botSecret}, {accessToken: botAccessToken, refreshToken: botRefreshToken, expiresIn:0, scope:['chat:read', 'chat:edit']});
const psAuthProvider = new RefreshingAuthProvider({clientId: clientId, clientSecret: botSecret}, {accessToken: psUserAccessToken, refreshToken: psUserRefreshToken, expiresIn:0, scope:['channel:read:redemptions']});


console.log('in main')
// const authProvider = new StaticAuthProvider(clientId, botAccessToken);
const chatClient = new ChatClient({ authProvider, channels: ['aaroniush'] });
console.log('connecting');
await chatClient.connect();

const ps = new PubSubClient();
await ps.registerUserListener(psAuthProvider, 43658519);
await ps.onRedemption(43658519, redemption => {
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
        if (channel) {
            chatClient.say(channel, redeemMessage);
        }
    }


})
// await ps.listen(`channel-points-channel-v1.${process.env.userId}`, authProvider);
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

// app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`))
