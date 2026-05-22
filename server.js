const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Configuración de CORS para producción
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(express.static(path.join(__dirname, 'public')));

const rooms = {};

io.on('connection', (socket) => {
    console.log('Usuario conectado:', socket.id);

    socket.on('createRoom', (data) => {
        const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        rooms[roomCode] = {
            host: socket.id,
            players: [{ id: socket.id, username: data.username }],
            settings: { maxPlayers: data.players, maxImpostors: data.impostors },
            status: 'waiting'
        };
        socket.join(roomCode);
        socket.emit('roomCreated', { code: roomCode, players: rooms[roomCode].players });
    });

    socket.on('joinRoom', (data) => {
        const code = data.code.trim().toUpperCase();
        if (rooms[code]) {
            const room = rooms[code];
            if (room.players.length < room.settings.maxPlayers && room.status === 'waiting') {
                room.players.push({ id: socket.id, username: data.username });
                socket.join(code);
                socket.emit('roomCreated', { code: code, players: room.players });
                io.to(code).emit('updatePlayerList', room.players);
            } else {
                socket.emit('errorMsg', "Sala llena o ya iniciada.");
            }
        } else {
            socket.emit('errorMsg', "Esa sala no existe.");
        }
    });

    socket.on('startGame', (code) => {
        const room = rooms[code.toUpperCase()];
        if (room && socket.id === room.host) {
            room.status = 'playing';
            let shuffled = [...room.players].sort(() => 0.5 - Math.random());
            let numImpostors = Math.min(room.settings.maxImpostors, room.players.length - 1);
            if (numImpostors < 1) numImpostors = 1;
            const impostorIds = shuffled.slice(0, numImpostors).map(p => p.id);

            room.players.forEach(player => {
                const isImpostor = impostorIds.includes(player.id);
                io.to(player.id).emit('gameStarted', {
                    role: isImpostor ? 'IMPOSTOR' : 'INOCENTE',
                    impostorsCount: numImpostors
                });
            });
        }
    });

    socket.on('disconnect', () => {
        console.log('Usuario desconectado');
    });
});

// IMPORTANTE: Render usa process.env.PORT
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});