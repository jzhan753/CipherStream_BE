import cors from 'cors';
import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';

// We want to share the server between express and websockets
const app = express();
const server = http.createServer();

// Enable CORS
app.use(cors());

// The websocket server
const wss = new WebSocketServer({ path: `/socket`, server: server });

// We store the mappings between session ID and websockets here
const sockets = new Map();

// Handle websocket connections
// We parse the `sid` parameter in the request and use that to store the created connection
wss.on('connection', (ws, req) => {
    let url = new URL(req.url || '', `http://${req.headers.host}`)
    let sid = url.searchParams.get('sid');
    let sender = url.searchParams.get('sender');
    console.log(`Connection on ${sid}`);

    // This SID is invalid!
    if (!sockets.has(sid)) {
        ws.close();
        return;
    }

    switch (sender) {
        case '0':
            console.log(`Receiver connected on ${sid}`);
            sockets.get(sid).receivers.push(ws);
            break;
        case '1':
            if (sockets.get(sid).sender === undefined) {
                console.log(`Sender connected on ${sid}`);
                ws.on('message', (data, _) => {
                    console.log(sockets.get(sid).receivers);
                    for (let s of sockets.get(sid).receivers) {
                        console.log(`Sending to: ${s.toString()}`);
                        s.send(data);
                    }
                });
                sockets.get(sid).sender = ws;
                break;
            }
        default:
            ws.close();
            break;
    }
});

app.get('/session_open', (req, res) => {
    // We generate a UUID to get uniqueness
    let uuid = crypto.randomUUID();

    // We then append a random nonce to prevent guessing
    let randBuf = new Uint8Array(32);
    crypto.getRandomValues(randBuf);
    crypto.subtle.digest('SHA-256', randBuf).then((nonce) => {
        let sessionID = uuid + '_' + Buffer.from(nonce).toString('base64url');
        sockets.set(sessionID, { receivers: [] });
        res.send(sessionID);
    });
});

app.get('/session_close/:sid', (req, res) => {
    let sid = req.params.sid;
    console.log(`Closing socket ${sid} due to user request`);

});

server.on('request', app);

server.listen(3000, () => {
    console.log('Server listening on port 3000.');
});
