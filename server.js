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
    { a: "Pizza", b: "Hamburguesa" }, { a: "Messi", b: "Maradona" },
    { a: "Derecho Civil", b: "Derecho Penal" }, { a: "Cerveza", b: "Fernet" },
    { a: "Bulevar", b: "Costanera" }, { a: "Liso", b: "Artesanal" },
    { a: "Mate", b: "Café" }, { a: "Facultad", b: "Biblioteca" }
];

io.on('connection', (socket) => {
    socket.on('createRoom', (data) => {
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        rooms[code] = {
            host: socket.id,
            players: [{ id: socket.id, username: data.username, role: null, palabra: null }],
            settings: { maxPlayers: data.players, maxImpostors: data.impostors },
            status: 'waiting',
            currentImpostors: 0
        };
        socket.join(code);
        socket.emit('roomCreated', { code, players: rooms[code].players });
    });

    socket.on('joinRoom', (data) => {
        const code = data.code.toUpperCase();
        const room = rooms[code];
        if (!room) return socket.emit('errorMsg', "SALA NO ENCONTRADA");

        let player = room.players.find(p => p.username.toLowerCase() === data.username.toLowerCase());

        if (player) {
            player.id = socket.id; // Actualizar ID al nuevo socket
            socket.join(code);
            if (room.players[0].username === player.username) room.host = socket.id;
            
            socket.emit('roomCreated', { code, players: room.players });

            if (room.status === 'playing' && player.role) {
                socket.emit('gameStarted', {
                    role: player.role,
                    palabra: player.palabra,
                    count: room.currentImpostors,
                    isHost: socket.id === room.host
                });
            }
        } else if (room.status === 'waiting' && room.players.length < room.settings.maxPlayers) {
            room.players.push({ id: socket.id, username: data.username, role: null, palabra: null });
            socket.join(code);
            socket.emit('roomCreated', { code, players: room.players });
        }
        io.to(code).emit('updatePlayerList', room.players);
    });

    socket.on('startGame', (code) => {
        const room = rooms[code.toUpperCase()];
        if (room && socket.id === room.host) {
            room.status = 'playing';
            const pareja = PALABRAS[Math.floor(Math.random() * PALABRAS.length)];
            let shuffled = [...room.players].sort(() => 0.5 - Math.random());
            let numImp = Math.min(room.settings.maxImpostors, room.players.length - 1);
            room.currentImpostors = numImp;

            const impostorIds = shuffled.slice(0, numImp).map(p => p.id);
            room.players.forEach(p => {
                const isImp = impostorIds.includes(p.id);
                p.role = isImp ? 'IMPOSTOR' : 'DETECTIVE';
                p.palabra = isImp ? pareja.b : pareja.a;
                io.to(p.id).emit('gameStarted', {
                    role: p.role, palabra: p.palabra, count: numImp, isHost: p.id === room.host
                });
            });
        }
    });

    socket.on('nextRound', (code) => {
        const room = rooms[code.toUpperCase()];
        if (room && socket.id === room.host) {
            // Lógica idéntica a startGame para nueva ronda
            const pareja = PALABRAS[Math.floor(Math.random() * PALABRAS.length)];
            let shuffled = [...room.players].sort(() => 0.5 - Math.random());
            let numImp = room.currentImpostors;
            const impostorIds = shuffled.slice(0, numImp).map(p => p.id);
            room.players.forEach(p => {
                const isImp = impostorIds.includes(p.id);
                p.role = isImp ? 'IMPOSTOR' : 'DETECTIVE';
                p.palabra = isImp ? pareja.b : pareja.a;
                io.to(p.id).emit('gameStarted', {
                    role: p.role, palabra: p.palabra, count: numImp, isHost: p.id === room.host
                });
            });
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Servidor listo"));