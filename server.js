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
    { a: "Pascua", b: "Domingo" },
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