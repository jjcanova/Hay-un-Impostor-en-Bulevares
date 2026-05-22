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
    { a: "Facultad", b: "Biblioteca" },
    { a: "Liso", b: "Artesanal" },
    { a: "Alfajor", b: "Galletita" },
    { a: "Invierno", b: "Verano" },
    { a: "Asado", b: "Locro" }
];

function iniciarJuego(code) {
    const room = rooms[code];
    room.status = 'playing';
    
    const pareja = PALABRAS[Math.floor(Math.random() * PALABRAS.length)];
    const jugadoresActuales = room.players; // Usamos los que están, no el máximo
    
    let shuffled = [...jugadoresActuales].sort(() => 0.5 - Math.random());
    
    // Calculamos impostores basados en los presentes
    // Si hay pocos, bajamos el número automáticamente para no romper el juego
    let numImpostors = Math.min(room.settings.maxImpostors, jugadoresActuales.length - 1);
    if (numImpostors < 1) numImpostors = 1;

    const impostorIds = shuffled.slice(0, numImpostors).map(p => p.id);

    jugadoresActuales.forEach(p => {
        const isImp = impostorIds.includes(p.id);
        io.to(p.id).emit('gameStarted', {
            role: isImp ? 'IMPOSTOR' : 'DETECTIVE',
            palabra: isImp ? pareja.b : pareja.a,
            count: numImpostors,
            isHost: p.id === room.host
        });
    });
}

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
        const room = rooms[code];
        if (room && room.status === 'waiting') {
            if (room.players.length < room.settings.maxPlayers) {
                room.players.push({ id: socket.id, username: data.username });
                socket.join(code);
                socket.emit('roomCreated', { code, players: room.players });
                io.to(code).emit('updatePlayerList', room.players);
            } else {
                socket.emit('errorMsg', "La sala está llena.");
            }
        } else {
            socket.emit('errorMsg', "Sala no disponible.");
        }
    });

    socket.on('startGame', (code) => {
        const room = rooms[code.toUpperCase()];
        if (room && socket.id === room.host) {
            if (room.players.length >= 3) { // Mínimo 3 para jugar
                iniciarJuego(code.toUpperCase());
            } else {
                socket.emit('errorMsg', "Necesitas al menos 3 jugadores.");
            }
        }
    });

    socket.on('nextRound', (code) => {
        if (rooms[code.toUpperCase()] && socket.id === rooms[code.toUpperCase()].host) {
            iniciarJuego(code.toUpperCase());
        }
    });

    socket.on('disconnect', () => {
        // Limpieza básica si todos se van (opcional)
        console.log("Usuario fuera");
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Servidor multijugador listo"));