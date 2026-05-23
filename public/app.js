const socket = io();
let currentRoomCode = null;

// Al cargar la página, intentamos recuperar la sesión
window.onload = () => {
    const savedName = localStorage.getItem('player_name');
    const savedCode = localStorage.getItem('room_code');
    
    if (savedName && savedCode) {
        console.log("Intentando reconectar a:", savedCode);
        socket.emit('joinRoom', { username: savedName, code: savedCode, reconnect: true });
    }
};

window.changeValue = function(type, delta) {
    const id = type === 'players' ? 'val-players' : 'val-impostors';
    const el = document.getElementById(id);
    let val = parseInt(el.innerText);
    val = type === 'players' ? Math.min(30, Math.max(3, val + delta)) : Math.min(15, Math.max(1, val + delta));
    el.innerText = val;
};

document.getElementById('btn-create').onclick = () => {
    document.getElementById('modal-name').classList.remove('hidden');
    window.isCreating = true;
};

document.getElementById('btn-join').onclick = () => {
    const code = document.getElementById('room-code').value.trim().toUpperCase();
    if (code.length === 6) {
        localStorage.setItem('room_code', code);
        document.getElementById('modal-name').classList.remove('hidden');
        window.isCreating = false;
    } else {
        alert("CÓDIGO INVÁLIDO");
    }
};

document.getElementById('btn-confirm-name').onclick = () => {
    const name = document.getElementById('player-name-input').value.trim();
    if (!name) return alert("ELEGÍ UN NOMBRE");

    localStorage.setItem('player_name', name);
    const code = localStorage.getItem('room_code');

    if (window.isCreating) {
        const p = document.getElementById('val-players').innerText;
        const i = document.getElementById('val-impostors').innerText;
        socket.emit('createRoom', { username: name, players: parseInt(p), impostors: parseInt(i) });
    } else {
        socket.emit('joinRoom', { username: name, code: code });
    }
    document.getElementById('modal-name').classList.add('hidden');
};

socket.on('roomCreated', (data) => {
    currentRoomCode = data.code;
    localStorage.setItem('room_code', data.code);
    document.getElementById('screen-login').classList.add('hidden');
    document.getElementById('screen-lobby').classList.remove('hidden');
    document.getElementById('display-room-code').innerText = data.code;
    updateGrid(data.players);
});

socket.on('updatePlayerList', (players) => updateGrid(players));

socket.on('gameStarted', (data) => {
    // Guardamos el estado del juego para que no se pierda al recargar
    localStorage.setItem('game_state', JSON.stringify(data));
    renderGame(data);
});

function renderGame(data) {
    document.getElementById('screen-lobby').classList.add('hidden');
    document.getElementById('screen-login').classList.add('hidden');
    const screenGame = document.getElementById('screen-game');
    screenGame.classList.remove('hidden');

    const content = document.getElementById('game-content');
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
            <button class="btn-primary" onclick="setReady()">¡LISTO!</button>
        </div>
        <div id="game-phase-debate" class="hidden">
            <div class="setup-box">
                <h2 class="highlight-text">DEBATE</h2>
                <div class="divider"></div>
                ${data.isHost ? `<button class="btn-primary" onclick="nextRound()">SIGUIENTE RONDA</button>` : `<p>Esperando al anfitrión...</p>`}
                <button onclick="leaveRoom()" class="btn-link-exit">SALIR AL MENÚ</button>
            </div>
        </div>
    `;
}

window.leaveRoom = function() {
    localStorage.clear();
    location.reload();
};

// ... (las funciones toggleVisibility, setReady y updateGrid se mantienen igual)