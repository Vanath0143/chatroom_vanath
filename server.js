const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');


const app = express();
const server = http.createServer(app);
const io = new Server(server, {
cors: { origin: '*' }
});


// Serve static files
app.use(express.static(path.join(__dirname, 'public')));


// In-memory state (resets on server restart)
const history = []; // {user, text, ts}
const users = new Map(); // socket.id -> username


io.on('connection', (socket) => {
// Default name
users.set(socket.id, `Guest-${String(socket.id).slice(0,4)}`);
const myName = users.get(socket.id);


// Send history + user list to the newcomer
socket.emit('init', { history: history.slice(-100), users: [...users.values()] });


// Announce join
io.emit('system', { text: `${myName} joined`, ts: Date.now() });


socket.on('set-name', (name) => {
const clean = String(name || '').trim().slice(0,24) || users.get(socket.id);
const old = users.get(socket.id);
users.set(socket.id, clean);
io.emit('system', { text: `${old} is now ${clean}`, ts: Date.now() });
io.emit('users', [...users.values()]);
});


socket.on('typing', (isTyping) => {
socket.broadcast.emit('typing', { user: users.get(socket.id), isTyping: !!isTyping });
});


socket.on('message', (text) => {
const clean = String(text || '').slice(0, 2000);
if (!clean.trim()) return;
const msg = { user: users.get(socket.id), text: clean, ts: Date.now() };
history.push(msg);
io.emit('message', msg);
});


socket.on('disconnect', () => {
const name = users.get(socket.id);
users.delete(socket.id);
io.emit('system', { text: `${name} left`, ts: Date.now() });
io.emit('users', [...users.values()]);
});
});


const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Chat server listening on http://localhost:${PORT}`));