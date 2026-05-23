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
    { a: "Padre Carranza", b: "Cara Dura" }
    { a: "Nacho Ocampo", b: "Fugaz" },
    { a: "Sacerdote", b: "Cuello" },
    { a: "Vianda", b: "Comida" },
    { a: "Navidad", b: "Nacimiento" },
    { a: "Pascua", b: "Domingo" },
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
});// Dentro de io.on('connection', ...) modificar el evento 'startGame' y la función iniciarPartida
function renderGame(data) {
    const screenGame = document.getElementById('screen-game');
    const content = document.getElementById('game-content');
    
    document.getElementById('screen-login').classList.add('hidden');
    document.getElementById('screen-lobby').classList.add('hidden');
    screenGame.classList.remove('hidden');

    if (data.role === 'ADMIN') {
        // PANEL DE ADMINISTRADOR (SUPERVISOR)
        content.innerHTML = `
            <div class="setup-box">
                <h3 class="panel-title">PANEL DE CONTROL (ADMIN)</h3>
                <div class="admin-info">
                    <p><strong>PALABRAS:</strong> ${data.palabra}</p>
                </div>
                <div id="admin-player-list" class="admin-grid">
                    ${data.allPlayers.filter(p => p.role !== 'ADMIN').map(p => `
                        <div class="player-card admin-view" id="card-${p.id}" onclick="toggleEliminar('${p.id}')">
                            <span>${p.username.toUpperCase()}</span>
                            <br>
                            <small class="${p.role.toLowerCase()}">${p.role}</small>
                        </div>
                    `).join('')}
                </div>
                <div class="divider"></div>
                <button class="btn-primary" onclick="nextRound()">NUEVA RONDA / REINICIAR</button>
                <button onclick="leaveRoom()" class="btn-link-exit">CERRAR SALA</button>
            </div>
        `;
    } else {
        // INTERFAZ DE JUGADOR NORMAL (se mantiene igual)
        content.innerHTML = `
            <div id="game-phase-reveal">
                <div id="role-box" class="blur-content" onclick="toggleVisibility('role-box')">
                    <p class="tap-hint">VER MI ROL</p>
                    <div class="real-content">
                        <h2 class="${data.role.toLowerCase()}">ERES ${data.role}</h2>
                        <p>HAY ${data.count} IMPOSTOR(ES)</p>
                    </div>
                </div>
                <div id="word-box" class="blur-content" onclick="toggleVisibility('word-box')">
                    <p class="tap-hint">VER PALABRA SECRETA</p>
                    <div class="real-content">
                        <h1 class="word-highlight">${data.palabra.toUpperCase()}</h1>
                    </div>
                </div>
                <button class="btn-primary" onclick="setReady()">ENTRAR A DEBATE</button>
            </div>
            <div id="game-phase-debate" class="hidden">
                <div class="setup-box" style="text-align:center">
                    <h2 class="highlight-text">DEBATE</h2>
                    <p>Mantené la pantalla encendida</p>
                    <div class="divider"></div>
                    <button onclick="leaveRoom()" class="btn-link-exit">SALIR</button>
                </div>
            </div>
        `;
    }
}

// Función para que el Admin marque eliminados (solo visual en su pantalla para guiar el debate)
window.toggleEliminar = (id) => {
    const card = document.getElementById(`card-${id}`);
    card.classList.toggle('eliminado');
};


});
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Servidor listo"));