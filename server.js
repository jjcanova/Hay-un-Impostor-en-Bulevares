const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(path.join(__dirname, 'public')));

const rooms = {};

// NUEVO: Diccionario de categorías
const CATEGORIAS = {
    lugares: [
        { a: "Hospital", b: "Clínica" }, { a: "Banco", b: "Caja Fuerte" },
        { a: "Cine", b: "Teatro" }, { a: "Playa", b: "Río" },
        { a: "Universidad", b: "Colegio" }, { a: "Supermercado", b: "Kiosco" },
        { a: "Aeropuerto", b: "Terminal" }, { a: "Restaurante", b: "Comedor" }
    ],
    profesiones: [
        { a: "Médico", b: "Enfermero" }, { a: "Policía", b: "Detective" },
        { a: "Bombero", b: "Rescatista" }, { a: "Abogado", b: "Juez" },
        { a: "Cocinero", b: "Panadero" }, { a: "Piloto", b: "Chofer" },
        { a: "Ingeniero", b: "Arquitecto" }, { a: "Músico", b: "Cantante" }
    ],
    comida: [
        { a: "Asado", b: "Parrillada" }, { a: "Empanadas", b: "Pastelitos" },
        { a: "Pizza", b: "Calzone" }, { a: "Cerveza", b: "Vino" },
        { a: "Helado", b: "Postre" }, { a: "Hamburguesa", b: "Pancho" },
        { a: "Fideos", b: "Ñoquis" }, { a: "Mate", b: "Té" }
    ],
    deportes: [
        { a: "Fútbol", b: "Futsal" }, { a: "Rugby", b: "Fútbol Americano" },
        { a: "Básquet", b: "Vóley" }, { a: "Tenis", b: "Pádel" },
        { a: "Natación", b: "Waterpolo" }, { a: "Boxeo", b: "Artes Marciales" },
        { a: "Gimnasio", b: "Crossfit" }, { a: "Ciclismo", b: "Motociclismo" }
    ],
    cumple_jorge: [
        { a: "Belgrano", b: "Descenso" }, { a: "Jorge", b: "Residencia" },
        { a: "Pali", b: "Gym" }, { a: "Rugby", b: "Nueva Zelanda" },
        { a: "Pancho", b: "Comida" }, { a: "Mauro", b: "Ley" },
        { a: "Perón", b: "Política" }, { a: "Calefacción", b: "Frío" },
        { a: "Abogado", b: "Trabajo" }, { a: "Mate", b: "Liquido" },
        { a: "Golf", b: "Campeón" }, { a: "Coca", b: "Gas" },
        { a: "Fernando", b: "Alto" }, { a: "Cigarrillos", b: "Filtro" },
        { a: "Tucumán", b: "Origen" }, { a: "Gaitas Escocesas", b: "Música" },
        { a: "Padre Cacho", b: "Nuevo" }, { a: "Padre Cheme", b: "Bicicleta" },
        { a: "Piano", b: "Música" }, { a: "Caima", b: "Pileta" },
        { a: "Padre Félix", b: "Consejos" }, { a: "Padre Carranza", b: "Cara Dura" },
        { a: "Nacho Ocampo", b: "Fugaz" }, { a: "Sacerdote", b: "Cuello" },
        { a: "Vianda", b: "Comida" }, { a: "Navidad", b: "Nacimiento" },
        { a: "Pascua", b: "Domingo" }
    ]
};

io.on('connection', (socket) => {
    socket.on('createRoom', (data) => {
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        rooms[code] = {
            host: socket.id,
            players: [{ id: socket.id, username: data.username, role: 'ADMIN', palabra: null }],
            settings: { maxPlayers: data.players, maxImpostors: data.impostors },
            status: 'waiting',
            currentImpostors: 0,
            currentPair: null,
            wordBVisible: true,
            currentCategory: 'lugares' // Categoría por defecto
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
                    isHost: socket.id === room.host, allPlayers: player.role === 'ADMIN' ? room.players : null,
                    wordBVisible: room.wordBVisible,
                    currentCategory: room.currentCategory
                });
            }
        } else {
            let newPlayer = { id: socket.id, username: data.username, role: 'PLAYER', palabra: null };
            
            if (room.status === 'playing' && room.currentPair) {
                newPlayer.role = 'DETECTIVE';
                newPlayer.palabra = room.currentPair.a;
            }

            room.players.push(newPlayer);
            socket.join(code);
            socket.emit('roomCreated', { code, players: room.players });

            if (room.status === 'playing') {
                socket.emit('gameStarted', {
                    role: newPlayer.role, palabra: newPlayer.palabra, count: room.currentImpostors,
                    isHost: false, allPlayers: null,
                    wordBVisible: room.wordBVisible,
                    currentCategory: room.currentCategory
                });

                let hostPlayer = room.players.find(p => p.id === room.host);
                if (hostPlayer) {
                    io.to(room.host).emit('gameStarted', {
                        role: hostPlayer.role, palabra: hostPlayer.palabra, count: room.currentImpostors,
                        isHost: true, allPlayers: room.players,
                        wordBVisible: room.wordBVisible,
                        currentCategory: room.currentCategory
                    });
                }
            }
        }
        io.to(code).emit('updatePlayerList', room.players);
    });

    socket.on('playerLeft', (code) => {
        const room = rooms[code?.toUpperCase()];
        if (!room) return;

        const playerIndex = room.players.findIndex(p => p.id === socket.id);
        if (playerIndex !== -1) {
            const player = room.players[playerIndex];
            
            if (player.role === 'IMPOSTOR' && room.status === 'playing') {
                room.currentImpostors = Math.max(0, room.currentImpostors - 1);
            }
            
            room.players.splice(playerIndex, 1);

            if (room.status === 'waiting') {
                io.to(code).emit('updatePlayerList', room.players);
            } else if (room.status === 'playing') {
                const hostPlayer = room.players.find(p => p.id === room.host);
                if (hostPlayer) {
                    io.to(room.host).emit('gameStarted', {
                        role: hostPlayer.role, palabra: hostPlayer.palabra, count: room.currentImpostors,
                        isHost: true, allPlayers: room.players,
                        wordBVisible: room.wordBVisible,
                        currentCategory: room.currentCategory
                    });
                }
            }
        }
    });

    // NUEVO: Reciben la categoría del front
    socket.on('startGame', (data) => { iniciarPartida(data.code.toUpperCase(), null, data.categoria); });
    socket.on('nextRound', (data) => { iniciarPartida(data.code.toUpperCase(), null, data.categoria); });

    socket.on('startCustomRound', (data) => {
        if (!data.code) return;
        iniciarPartida(data.code.toUpperCase(), { a: data.palabraA, b: data.palabraB }, data.categoria);
    });

    socket.on('reassignRoles', (code) => {
        const room = rooms[code?.toUpperCase()];
        if (!room || socket.id !== room.host || room.status !== 'playing' || !room.currentPair) return;
        asignarYEnviarRoles(room, room.currentPair);
    });

    socket.on('toggleWordB', (code) => {
        const room = rooms[code?.toUpperCase()];
        if (!room || socket.id !== room.host) return;
        room.wordBVisible = !room.wordBVisible;
        io.to(code.toUpperCase()).emit('wordBStatusUpdate', room.wordBVisible);
    });

    socket.on('changeImpostorCount', (data) => {
        const room = rooms[data.code?.toUpperCase()];
        if (!room || socket.id !== room.host || room.status !== 'playing' || !room.currentPair) return;

        let changed = false;
        if (data.delta > 0) {
            let detectives = room.players.filter(p => p.role === 'DETECTIVE' && p.id !== room.host);
            if (detectives.length > 0) {
                let chosen = detectives[Math.floor(Math.random() * detectives.length)];
                chosen.role = 'IMPOSTOR';
                chosen.palabra = room.currentPair.b;
                room.currentImpostors++;
                changed = true;
            }
        } else if (data.delta < 0) {
            let impostors = room.players.filter(p => p.role === 'IMPOSTOR' && p.id !== room.host);
            if (impostors.length > 0) {
                let chosen = impostors[Math.floor(Math.random() * impostors.length)];
                chosen.role = 'DETECTIVE';
                chosen.palabra = room.currentPair.a;
                room.currentImpostors--;
                changed = true;
            }
        }

        if (changed) {
            room.players.forEach(p => {
                io.to(p.id).emit('gameStarted', {
                    role: p.role, palabra: p.palabra, count: room.currentImpostors,
                    isHost: p.id === room.host, allPlayers: p.id === room.host ? room.players : null,
                    wordBVisible: room.wordBVisible,
                    currentCategory: room.currentCategory
                });
            });
        }
    });

    // NUEVO: Modificado para procesar la categoría seleccionada
    function iniciarPartida(code, customPair = null, categoria = 'lugares') {
        const room = rooms[code];
        if (!room || socket.id !== room.host) return;
        room.status = 'playing';
        room.currentCategory = categoria;
        
        let pareja;
        if (customPair) {
            pareja = customPair;
        } else {
            const lista = CATEGORIAS[categoria] || CATEGORIAS['lugares'];
            pareja = lista[Math.floor(Math.random() * lista.length)];
        }

        asignarYEnviarRoles(room, pareja);
    }

    function asignarYEnviarRoles(room, pareja) {
        room.currentPair = pareja;
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
        });

        room.players.forEach(p => {
            io.to(p.id).emit('gameStarted', {
                role: p.role, palabra: p.palabra, count: numImp,
                isHost: p.id === room.host, allPlayers: p.id === room.host ? room.players : null,
                wordBVisible: room.wordBVisible,
                currentCategory: room.currentCategory
            });
        });
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Servidor iniciado en puerto " + PORT));