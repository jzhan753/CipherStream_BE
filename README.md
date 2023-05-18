# CipherStream Backend
An end-to-end encrypted private file streaming service.

## API Endpoints

### `GET /session_open`
Returns a randomly generated, unique session ID (`SID`) to identify a session.
This ID can be used to connect to an associated websocket on the server.

### `GET /session_close/${SID}`
Closes the websocket associated with the session given in `SID` and deletes related information.

## Session Protocol Description
A session takes place between a server, a sending user (User 1), and one or more receiving users (User 2).

1. User 1 connects to the main page and their client opens a session and connects to the associated websocket.
2. User 1's client securely generates a key to use for encryption, and changes the URL to include both the session ID and the key.
3. User 1 shares the URL with User 2.
4. User 2 connects to the shared URL, and their client connects to the associated websocket.
5. The server, upon detecting a connection to the associated websocket, notifies User 1's client.
6. User 1 uploads a file, and their client first encrypts and sends a metadata packet across the associated websocket, before encrypting and sending the rest of file as chunks.
7. The server forwards the encrypted data to User 2's client, which uses the shared key to decrypt the metadata and each chunk and streams it into a file.
