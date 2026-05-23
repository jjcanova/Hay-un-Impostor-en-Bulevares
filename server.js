// ... (mismas variables PALABRAS y rooms)

io.on('connection', (socket) => {
    socket.on('createRoom', (data) => {
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        rooms[code] = {
            host: socket.id,
            players: [{ id: socket.id, username: data.username, role: null, palabra: null }],
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

        // BUSCAMOS SI EL JUGADOR YA ESTABA (RECONEXIÓN)
        const existingPlayer = room.players.find(p => p.username === data.username);

        if (existingPlayer) {
            existingPlayer.id = socket.id; // Actualizamos el ID del nuevo socket
            socket.join(code);
            if (socket.id !== room.host && room.players[0].id === existingPlayer.id) room.host = socket.id;
            
            socket.emit('roomCreated', { code, players: room.players });
            
            // Si el juego ya empezó, le mandamos sus datos de nuevo
            if (room.status === 'playing' && existingPlayer.role) {
                socket.emit('gameStarted', {
                    role: existingPlayer.role,
                    palabra: existingPlayer.palabra,
                    count: room.currentImpostors,
                    isHost: socket.id === room.host
                });
            }
        } else if (room.status === 'waiting') {
            room.players.push({ id: socket.id, username: data.username, role: null, palabra: null });
            socket.join(code);
            socket.emit('roomCreated', { code, players: room.players });
        }
        io.to(code).emit('updatePlayerList', room.players);
    });

    socket.on('startGame', (code) => {
        const room = rooms[code.toUpperCase()];
        if (room && socket.id === room.host) {
            iniciarPartida(code.toUpperCase());
        }
    });

    // ... (función iniciarPartida que ahora guarde el rol/palabra en el objeto player)
});

function iniciarPartida(code) {
    const room = rooms[code];
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
            role: p.role,
            palabra: p.palabra,
            count: numImp,
            isHost: p.id === room.host
        });
    });
}