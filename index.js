const express = require('express');
const https = require('https');
const twitchPs = require('twitchps');
const { runInNewContext } = require('vm');
const app = express();
const port = process.env.PORT

let init_topics = [{topic: 'video-playback.aaroniush'}, {topic: 'channel-points-channel-v1.43658519',  token: 'xspuijgr5ghqsuila5o82tq31h4trw'}];
var ps = new twitchPs({reconnect: false, init_topics: init_topics, debug: true});
console.log(process.env.PORT);
ps.on('channel-points', (data) => {
    console.log('channel point redemption!');
    console.log(data);
});

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
        if (data.reward.id === '8bfd8f73-7068-422d-89e8-408fd3102d89') {
            console.log(`sending 'nice' from ${data.user.display_name}`);
            res.write(data.redemption.user.display_name);
        }
    });
    
    res.on('close', () => {
        console.log('client dropped me');
        res.end();
    });
});

app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`))
