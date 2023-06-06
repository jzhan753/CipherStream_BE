import cors from 'cors';
import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';

// We want to share the server between express and websockets
const app = express();
const server = http.createServer();

// Enable CORS
app.use(cors());

// The websocket server
const wss = new WebSocketServer({ path: `/socket`, server: server, maxPayload: 268435456 });

// We store the mappings between session ID and websockets here
const sockets = new Map<string, { sender: WebSocket | undefined, receivers: Set<WebSocket> }>();

// Handle websocket connections
// We parse the `sid` parameter in the request and use that to store the created connection
wss.on('connection', (ws, req) => {
    let url = new URL(req.url || '', `http://${req.headers.host}`)
    let sid = url.searchParams.get('sid') || '';
    let sender = url.searchParams.get('sender');
    console.log(`Connection on ${sid}`);

    let connection = sockets.get(sid);

    // This SID is invalid!
    if (connection == undefined) {
        ws.close();
        ws.CLOSED
        return;
    }



    switch (sender) {
        case '0':
            console.log(`Receiver connected on ${sid}`);
            let receivers = connection?.receivers;
            ws.on('close', (_code, _reason) => {
                receivers.delete(ws);
            });
            receivers.add(ws);
            break;
        case '1':
            if (connection.sender === undefined) {
                let receivers = connection.receivers
                console.log(`Sender connected on ${sid}`);
                ws.on('message', (data, _) => {
                    console.log(`Sending to ${receivers.size} receivers`);
                    receivers.forEach((s, _key, _set) => {
                        s.send(data);
                    });
                });
                connection.sender = ws;
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
        sockets.set(sessionID, { sender: undefined, receivers: new Set<WebSocket>() });
        res.send(sessionID);
    });
});

app.get('/session_close/:sid', (req, res) => {
    let sid = req.params.sid;
    sockets.get(sid)?.sender?.close();
    sockets.delete(sid);
    console.log(`Closing socket ${sid} due to user request`);
});

server.on('request', app);

server.listen(3000, () => {
    console.log('Server listening on port 3000.');
});
