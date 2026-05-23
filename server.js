const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(path.join(__dirname, 'public')));

const rooms = {};

// TU NUEVA LISTA DE PALABRAS PERSONALIZADAS
const PALABRAS = [
    { a: "Belgrano", b: "Descenso" },
    { a: "Jorge", b: "Residencia" },
    { a: "Pali", b: "Gym" },
    { a: "Rugby", b: "Nueva Zelanda" },
    { a: "Pancho", b: "Comida" },
    { a: "Mauro", b: "Ley" },
    { a: "Perón", b: "Política" },
    { a: "Calefacción", b: "Frío" },
    { a: "Abogado", b: "Trabajo" },
    { a: "Mate", b: "Liquido" },
    { a: "Golf", b: "Campeón" },
    { a: "Coca", b: "Gas" },
    { a: "Fernando", b: "Alto" },
    { a: "Cigarrillos", b: "Filtro" },
    { a: "Tucumán", b: "Origen" },
    { a: "Gaitas Escocesas", b: "Música" },
    { a: "Padre Cacho", b: "Nuevo" },
    { a: "Padre Cheme", b: "Bicicleta" },
    { a: "Piano", b: "Música" },
    { a: "Caima", b: "Pileta" },
    { a: "Padre Félix", b: "Consejos" },
    { a: "Padre Carranza", b: "Cara Dura" },
    { a: "Nacho Ocampo", b: "Fugaz" },
    { a: "Sacerdote", b: "Cuello" },
    { a: "Vianda", b: "Comida" },
    { a: "Navidad", b: "Nacimiento" },
    { a: "Pascua", b: "Domingo" }
];

io.on('connection', (socket) => {
    socket.on('createRoom', (data) => {
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        rooms[code] = {
            host: socket.id,
            players: [{ id: socket.id, username: data.username, role: 'ADMIN', palabra: null }],
            settings: { maxPlayers: data.players, maxImpostors: data.impostors },
            status: 'waiting'
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
            player.id = socket.id;
            socket.join(code);
            if (room.players[0].username === player.username) room.host = socket.id;
            socket.emit('roomCreated', { code, players: room.players });
            if (room.status === 'playing') {
                socket.emit('gameStarted', {
                    role: player.role, palabra: player.palabra, count: room.currentImpostors,
                    isHost: socket.id === room.host, allPlayers: player.role === 'ADMIN' ? room.players : null
                });
            }
        } else if (room.status === 'waiting') {
            room.players.push({ id: socket.id, username: data.username, role: 'PLAYER', palabra: null });
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
            let playersToAssign = room.players.filter(p => p.id !== room.host);
            let shuffled = [...playersToAssign].sort(() => 0.5 - Math.random());
            let numImp = Math.min(room.settings.maxImpostors, playersToAssign.length - 1);
            if (numImp < 1) numImp = 1;
            room.currentImpostors = numImp;

            const impostorIds = shuffled.slice(0, numImp).map(p => p.id);
            room.players.forEach(p => {
                if (p.id === room.host) {
                    p.role = 'ADMIN';
                    p.palabra = `D: ${pareja.a} | I: ${pareja.b}`;
                } else {
                    const isImp = impostorIds.includes(p.id);
                    p.role = isImp ? 'IMPOSTOR' : 'DETECTIVE';
                    p.palabra = isImp ? pareja.b : pareja.a;
                }
                io.to(p.id).emit('gameStarted', {
                    role: p.role, palabra: p.palabra, count: numImp,
                    isHost: p.id === room.host, allPlayers: p.id === room.host ? room.players : null
                });
            });
        }
    });

    socket.on('nextRound', (code) => {
        const room = rooms[code.toUpperCase()];
        if (room && socket.id === room.host) {
            const pareja = PALABRAS[Math.floor(Math.random() * PALABRAS.length)];
            let playersToAssign = room.players.filter(p => p.id !== room.host);
            let shuffled = [...playersToAssign].sort(() => 0.5 - Math.random());
            const impostorIds = shuffled.slice(0, room.currentImpostors).map(p => p.id);
            room.players.forEach(p => {
                if (p.id === room.host) {
                    p.palabra = `D: ${pareja.a} | I: ${pareja.b}`;
                } else {
                    const isImp = impostorIds.includes(p.id);
                    p.role = isImp ? 'IMPOSTOR' : 'DETECTIVE';
                    p.palabra = isImp ? pareja.b : pareja.a;
                }
                io.to(p.id).emit('gameStarted', {
                    role: p.role, palabra: p.palabra, count: room.currentImpostors,
                    isHost: p.id === room.host, allPlayers: p.id === room.host ? room.players : null
                });
            });
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Servidor con palabras nuevas listo"));