const socket = io();
let pendingCode = null;
let currentRoomCode = null;

window.changeValue = function(type, delta) {
    const id = type === 'players' ? 'val-players' : 'val-impostors';
    const el = document.getElementById(id);
    let val = parseInt(el.innerText);
    val = type === 'players' ? Math.min(30, Math.max(1, val + delta)) : Math.min(15, Math.max(1, val + delta));
    el.innerText = val;
};

window.closeModal = function() {
    document.getElementById('modal-name').classList.add('hidden');
};

document.getElementById('btn-create').onclick = () => {
    pendingCode = null;
    document.getElementById('modal-name').classList.remove('hidden');
};

document.getElementById('btn-join').onclick = () => {
    const code = document.getElementById('room-code').value.trim().toUpperCase();
    if (code.length === 6) {
        pendingCode = code;
        document.getElementById('modal-name').classList.remove('hidden');
    } else {
        alert("Código de 6 letras.");
    }
};

document.getElementById('btn-confirm-name').onclick = () => {
    const name = document.getElementById('player-name-input').value.trim();
    if (!name) return;
    if (pendingCode) {
        socket.emit('joinRoom', { username: name, code: pendingCode });
    } else {
        const p = document.getElementById('val-players').innerText;
        const i = document.getElementById('val-impostors').innerText;
        socket.emit('createRoom', { username: name, players: parseInt(p), impostors: parseInt(i) });
    }
    closeModal();
};

document.getElementById('btn-start').onclick = () => {
    if (currentRoomCode) socket.emit('startGame', currentRoomCode);
};

socket.on('roomCreated', (data) => {
    currentRoomCode = data.code;
    document.getElementById('screen-login').classList.add('hidden');
    document.getElementById('screen-lobby').classList.remove('hidden');
    document.getElementById('display-room-code').innerText = data.code;
    updateGrid(data.players);
});

socket.on('updatePlayerList', (players) => updateGrid(players));

socket.on('gameStarted', (data) => {
    // Ocultar Lobby y mostrar Pantalla de Juego
    document.getElementById('screen-lobby').classList.add('hidden');
    const screenGame = document.getElementById('screen-game');
    screenGame.classList.remove('hidden');

    const content = document.getElementById('game-content');
    content.innerHTML = `
        <div class="role-header ${data.role.toLowerCase()}">
            <h2>ERES ${data.role}</h2>
            <p>Hay ${data.count} impostor(es) infiltrado(s).</p>
        </div>
        
        <div class="secret-word-box">
            <p>TU PALABRA SECRETA ES:</p>
            <h1 class="word-highlight">${data.palabra.toUpperCase()}</h1>
        </div>

        <div class="instructions">
            <h3>¿QUÉ HACER?</h3>
            <p>Piensa en <b>una sola palabra</b> descriptiva. Si eres impostor, ¡intenta descubrir la palabra de los detectives!</p>
        </div>

        <button onclick="location.reload()" class="btn-secondary" style="margin-top:20px">VOLVER AL INICIO</button>
    `;
});

function updateGrid(players) {
    const grid = document.getElementById('players-grid');
    grid.innerHTML = '';
    players.forEach((p, index) => {
        const isHost = index === 0;
        grid.innerHTML += `
            <div class="player-card ${isHost ? 'host' : ''}">
                <div class="player-icon"></div>
                <div class="player-name">${p.username.toUpperCase()} ${p.id === socket.id ? '(TÚ)' : ''}</div>
                ${isHost ? '<div class="host-badge">ANFITRIÓN</div>' : ''}
            </div>`;
    });
}

socket.on('errorMsg', (msg) => alert(msg));