const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(path.join(__dirname, 'public')));

const rooms = {};
const PALABRAS = [
    { a: "Pizza", b: "Hamburguesa" },
    { a: "Messi", b: "Maradona" },
    { a: "Derecho Civil", b: "Derecho Penal" },
    { a: "Cerveza", b: "Fernet" },
    { a: "Gato", b: "Perro" },
    { a: "WhatsApp", b: "Instagram" },
    { a: "Bulevar", b: "Costanera" },
    { a: "Facultad", b: "Biblioteca" }
];

io.on('connection', (socket) => {
    socket.on('createRoom', (data) => {
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        rooms[code] = {
            host: socket.id,
            players: [{ id: socket.id, username: data.username }],
            settings: { maxPlayers: data.players, maxImpostors: data.impostors },
            status: 'waiting'
        };
        socket.join(code);
        socket.emit('roomCreated', { code, players: rooms[code].players });
    });

    socket.on('joinRoom', (data) => {
        const code = data.code.toUpperCase();
        if (rooms[code] && rooms[code].status === 'waiting') {
            rooms[code].players.push({ id: socket.id, username: data.username });
            socket.join(code);
            socket.emit('roomCreated', { code, players: rooms[code].players });
            io.to(code).emit('updatePlayerList', rooms[code].players);
        } else {
            socket.emit('errorMsg', "No se pudo unir.");
        }
    });

    socket.on('startGame', (code) => {
        const room = rooms[code.toUpperCase()];
        if (room && socket.id === room.host) {
            room.status = 'playing';
            const pareja = PALABRAS[Math.floor(Math.random() * PALABRAS.length)];
            let shuffled = [...room.players].sort(() => 0.5 - Math.random());
            let numImpostors = Math.min(room.settings.maxImpostors, room.players.length - 1);
            if (numImpostors < 1) numImpostors = 1;
            const impostorIds = shuffled.slice(0, numImpostors).map(p => p.id);

            room.players.forEach(p => {
                const isImp = impostorIds.includes(p.id);
                io.to(p.id).emit('gameStarted', {
                    role: isImp ? 'IMPOSTOR' : 'DETECTIVE',
                    palabra: isImp ? pareja.b : pareja.a,
                    count: numImpostors
                });
            });
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Servidor listo"));