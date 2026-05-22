const socket = io();
let pendingCode = null;
let currentRoomCode = null;

window.changeValue = function(type, delta) {
    const id = type === 'players' ? 'val-players' : 'val-impostors';
    const el = document.getElementById(id);
    let val = parseInt(el.innerText);
    val = type === 'players' ? Math.min(30, Math.max(3, val + delta)) : Math.min(15, Math.max(1, val + delta));
    el.innerText = val;
};

window.closeModal = function() {
    document.getElementById('modal-name').classList.add('hidden');
    pendingCode = null;
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
        alert("El código debe tener 6 letras.");
    }
};

document.getElementById('btn-confirm-name').onclick = () => {
    const nameInput = document.getElementById('player-name-input');
    const name = nameInput.value.trim();
    if (!name) return alert("Elegí un nombre.");

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
    if (currentRoomCode) {
        socket.emit('startGame', currentRoomCode);
    }
};

socket.on('roomCreated', (data) => {
    currentRoomCode = data.code;
    document.getElementById('screen-login').classList.add('hidden');
    document.getElementById('screen-lobby').classList.remove('hidden');
    document.getElementById('display-room-code').innerText = data.code;
    updateGrid(data.players);
});

socket.on('updatePlayerList', (players) => {
    updateGrid(players);
});

socket.on('gameStarted', (data) => {
    document.getElementById('screen-lobby').classList.add('hidden');
    const screenGame = document.getElementById('screen-game');
    screenGame.classList.remove('hidden');

    const content = document.getElementById('game-content');
    content.innerHTML = `
        <div id="game-phase-reveal">
            <div id="role-box" class="role-header blur-content" onclick="toggleVisibility('role-box')">
                <p class="tap-hint">TAP PARA VER ROL</p>
                <div class="real-content">
                    <h2 class="${data.role.toLowerCase()}">ERES ${data.role}</h2>
                    <p>Hay ${data.count} impostor(es).</p>
                </div>
            </div>
            
            <div id="word-box" class="secret-word-box blur-content" onclick="toggleVisibility('word-box')">
                <p class="tap-hint">TAP PARA VER PALABRA</p>
                <div class="real-content">
                    <p>TU PALABRA SECRETA ES:</p>
                    <h1 class="word-highlight">${data.palabra.toUpperCase()}</h1>
                </div>
            </div>

            <button class="btn-primary" style="margin-top:20px" onclick="setReady()">¡LISTO! YA LA VI</button>
        </div>

        <div id="game-phase-debate" class="hidden">
            <div class="setup-box">
                <h2 class="highlight-text">FASE DE DEBATE</h2>
                <p>Den sus pistas uno por uno. El impostor intentará camuflarse con la soberbia de un detective.</p>
                <div class="divider"></div>
                ${data.isHost ? `<button class="btn-primary" onclick="nextRound()">SIGUIENTE RONDA</button>` : `<p class="text-muted">Esperando que el anfitrión inicie otra ronda...</p>`}
                <button onclick="location.reload()" class="btn-secondary" style="margin-top:10px; width:100%">SALIR AL MENÚ</button>
            </div>
        </div>
    `;
});

window.toggleVisibility = function(id) {
    document.getElementById(id).classList.toggle('revealed');
};

window.setReady = function() {
    document.getElementById('game-phase-reveal').classList.add('hidden');
    document.getElementById('game-phase-debate').classList.remove('hidden');
};

window.nextRound = function() {
    socket.emit('nextRound', currentRoomCode);
};

function updateGrid(players) {
    const grid = document.getElementById('players-grid');
    grid.innerHTML = '';
    players.forEach((p, index) => {
        const isHost = index === 0;
        const isMe = p.id === socket.id;
        grid.innerHTML += `
            <div class="player-card ${isHost ? 'host' : ''}">
                <div class="player-icon"></div>
                <div class="player-name">${p.username.toUpperCase()} ${isMe ? '(TÚ)' : ''}</div>
                ${isHost ? '<div class="host-badge">ANFITRIÓN</div>' : ''}
            </div>`;
    });
}

socket.on('errorMsg', (msg) => alert(msg));