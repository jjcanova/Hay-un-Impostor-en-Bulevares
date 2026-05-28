const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(path.join(__dirname, 'public')));

const rooms = {};

const CATEGORIAS = {
    lugares: [
        { a: "Hospital", b: "Blanco" }, { a: "Banco", b: "Silla" },
        { a: "Cine", b: "Shh!!" }, { a: "Playa", b: "Sol" },
        { a: "Universidad", b: "Banco" }, { a: "Supermercado", b: "Comprar" },
        { a: "Aeropuerto", b: "Viaje" }, { a: "Restaurante", b: "Rico" },
        { a: "Cementerio", b: "Triste" }, { a: "Boliche", b: "Noche" },
        { a: "Comisaría", b: "Rejas" }, { a: "Chopería", b: "Cerveza" }
    ],
    profesiones: [
        { a: "Médico", b: "Turno" }, { a: "Policía", b: "Placa" },
        { a: "Bombero", b: "Agua" }, { a: "Abogado", b: "Camisa" },
        { a: "Cocinero", b: "Estufa" }, { a: "Piloto", b: "Rápido" },
        { a: "Ingeniero", b: "Escuadra" }, { a: "Músico", b: "Callejero" },
        { a: "Programador", b: "Commputadora" }, { a: "Político", b: "Gobierno" },
        { a: "Profesor", b: "Clase" }
    ],
    comida: [
        { a: "Asado", b: "Vino" }, { a: "Empanadas", b: "Saladas" },
        { a: "Pizza", b: "Casera" }, { a: "Cerveza", b: "Rubia" },
        { a: "Helado", b: "Crema" }, { a: "Hamburguesa", b: "Queso" },
        { a: "Fideos", b: "Salsa" }, { a: "Mate", b: "Agua" },
        { a: "Choripán", b: "Pan" }, { a: "Milanesa de Carne", b: "Horno" },
        { a: "Locro", b: "Maiz" }, { a: "Fernet", b: "Noche" }
    ],
    deportes: [
        { a: "Fútbol", b: "Relatos" }, { a: "Rugby", b: "Blacks" },
        { a: "Básquet", b: "Anillo" }, { a: "Tenis", b: "Polvo" },
        { a: "Natación", b: "Manguito" }, { a: "Boxeo", b: "Salí de ahí" },
        { a: "Gimnasio", b: "Peso" }, { a: "Ciclismo", b: "Ruta" },
        { a: "Automovilismo", b: "Flaco" }
    ],
    argentina: [
        { a: "Buenos Aires", b: "Pizza" }, { a: "Dulce de Leche", b: "Pan" },
        { a: "Alfajor", b: "Triple" }, { a: "Bondi", b: "Amuchados" },
        { a: "Gaucho", b: "Interior" }, { a: "Córdoba", b: "Mona" },
        { a: "Rosario", b: "Fútbol" }, { a: "Mate", b: "Algarrobo" },
        { a: "Truco", b: "Dulce" },
        { a: "Santa Fe", b: "Local" }, { a: "Cumbia", b: "Santa fe" }
    ],
    futbol: [
        { a: "La bombonera", b: "Late" }, { a: "Copa Libertadores", b: "Gloria" },
        { a: "Mundial 2022", b: "Argentina" }, { a: "Lionel Messi", b: "Zurdo" },
        { a: "Riquelme", b: "Mate" }, { a: "Más Monumental", b: "Mudo" },
        { a: "Gallardo", b: "Estatua" }, { a: "Palermo", b: "Cabeza" },
        { a: "Cristiano Ronaldo", b: "Real Madrid" }, { a: "Neymar", b: "Talento" }
    ],
    cine: [
        { a: "El Padrino", b: "Oferta" }, { a: "Star Wars", b: "Pastilla" },
        { a: "Harry Potter", b: "3/4" }, { a: "Universo Marvel", b: "Yarvis" },
        { a: "Forest Gump", b: "Jenny" }, { a: "El secreto de sus ojos", b: "Cambiar" },
        { a: "La isla siniestra", b: "Faro" }, { a: "Esperando la Carroza", b: "La tía" },
        { a: "Relatos Salvajes", b: "Bombita" }, { a: "Son como niños", b: "El timbre" }
    ],
    videojuegos: [
        { a: "PlayStation", b: "Mando" }, { a: "Minecraft", b: "España" },
        { a: "FIFA", b: "Partidos" }, { a: "Mario Bros", b: "Italia" },
        { a: "GTA San Andreas", b: "Carl" }, { a: "Counter Strike", b: "Competitivo" },
        { a: "League of Legends", b: "Friki" }, { a: "Twitch", b: "Juegos" }
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
            currentCategory: 'lugares',
            hostIsPlaying: false // NUEVO: Estado del Host
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
                socket.emit('gameStarted', getPayloadForPlayer(room, player.id));
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
                socket.emit('gameStarted', getPayloadForPlayer(room, newPlayer.id));

                let hostPlayer = room.players.find(p => p.id === room.host);
                if (hostPlayer) {
                    io.to(room.host).emit('gameStarted', getPayloadForPlayer(room, room.host));
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
                    io.to(room.host).emit('gameStarted', getPayloadForPlayer(room, room.host));
                }
            }
        }
    });

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

    // NUEVO: Escucha el cambio de modo del Host
    socket.on('toggleHostMode', (code) => {
        const room = rooms[code?.toUpperCase()];
        if (!room || socket.id !== room.host) return;
        room.hostIsPlaying = !room.hostIsPlaying;
        
        // Si el juego está en curso, reasigna roles al instante
        if (room.status === 'playing' && room.currentPair) {
            asignarYEnviarRoles(room, room.currentPair);
        }
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
                io.to(p.id).emit('gameStarted', getPayloadForPlayer(room, p.id));
            });
        }
    });

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
        
        // NUEVO: Si el host juega, entra en la lista de sorteo. Si no, se lo excluye.
        let playersToAssign = room.hostIsPlaying ? room.players : room.players.filter(p => p.id !== room.host);
        let shuffled = [...playersToAssign].sort(() => 0.5 - Math.random());
        let numImp = Math.min(room.settings.maxImpostors, Math.max(1, playersToAssign.length - 1));
        room.currentImpostors = numImp;
        const impostorIds = shuffled.slice(0, numImp).map(p => p.id);

        room.players.forEach(p => {
            if (p.id === room.host && !room.hostIsPlaying) {
                p.role = 'ADMIN';
                p.palabra = `D: ${pareja.a} | I: ${pareja.b}`;
            } else {
                const isImp = impostorIds.includes(p.id);
                p.role = isImp ? 'IMPOSTOR' : 'DETECTIVE';
                p.palabra = isImp ? pareja.b : pareja.a;
            }
        });

        room.players.forEach(p => {
            io.to(p.id).emit('gameStarted', getPayloadForPlayer(room, p.id));
        });
    }

    // Función auxiliar para armar el paquete de datos según quién sea
    function getPayloadForPlayer(room, playerId) {
        const p = room.players.find(x => x.id === playerId);
        const isHost = p.id === room.host;
        
        // Ocultamos los roles a la lista que recibe el Host si está jugando
        const safePlayers = room.players.map(x => ({ id: x.id, username: x.username, role: 'HIDDEN' }));

        return {
            role: p.role, 
            palabra: p.palabra, 
            count: room.currentImpostors,
            isHost: isHost, 
            hostIsPlaying: room.hostIsPlaying,
            allPlayers: isHost ? (room.hostIsPlaying ? safePlayers : room.players) : null,
            wordBVisible: room.wordBVisible,
            currentCategory: room.currentCategory
        };
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Servidor iniciado en puerto " + PORT));