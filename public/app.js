const socket = io();
let pendingCode = null;
let currentRoomCode = null;

window.changeValue = function(type, delta) {
    const id = type === 'players' ? 'val-players' : 'val-impostors';
    const el = document.getElementById(id);
    let val = parseInt(el.innerText);
    if (type === 'players') {
        val = Math.min(30, Math.max(3, val + delta));
    } else {
        val = Math.min(15, Math.max(1, val + delta));
    }
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
        alert("CÓDIGO INVÁLIDO");
    }
};

document.getElementById('btn-confirm-name').onclick = () => {
    const nameInput = document.getElementById('player-name-input');
    const name = nameInput.value.trim();
    if (!name) return alert("EL SILENCIO NO ES UN ALIAS");

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
            <div id="role-box" class="blur-content" onclick="toggleVisibility('role-box')">
                <p class="tap-hint">VER MI ROL</p>
                <div class="real-content">
                    <h2 class="${data.role.toLowerCase()}" style="font-weight:900; font-size:1.5rem">ERES ${data.role}</h2>
                    <p style="font-size:0.7rem; color:#8e90a5">HAY ${data.count} IMPOSTOR(ES)</p>
                </div>
            </div>
            
            <div id="word-box" class="blur-content" onclick="toggleVisibility('word-box')">
                <p class="tap-hint">VER PALABRA SECRETA</p>
                <div class="real-content">
                    <p style="font-size:0.7rem; color:#8e90a5; letter-spacing:1px">PALABRA SECRETA</p>
                    <h1 class="word-highlight">${data.palabra.toUpperCase()}</h1>
                </div>
            </div>

            <button class="btn-primary" style="margin-top:20px" onclick="setReady()">LISTO</button>
        </div>

        <div id="game-phase-debate" class="hidden">
            <div class="setup-box" style="text-align:center">
                <h2 class="highlight-text" style="font-size:1.5rem">DEBATE</h2>
                <p style="font-size:0.8rem; color:#8e90a5; line-height:1.5">Den sus pistas en orden. <br> Detecten la soberbia del impostor.</p>
                <div class="divider"></div>
                ${data.isHost ? `<button class="btn-primary" onclick="nextRound()">SIGUIENTE RONDA</button>` : `<p style="font-size:0.7rem; color:#7c4dff">Esperando al anfitrión...</p>`}
                <button onclick="location.reload()" class="btn-secondary" style="margin-top:15px; width:100%; font-size:0.7rem">ABANDONAR</button>
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
                <div class="player-name">${p.username.toUpperCase()}</div>
                ${isHost ? '<div class="host-badge">HOST</div>' : ''}
                ${isMe ? '<div style="font-size:0.5rem; color:#7c4dff; margin-top:2px">TÚ</div>' : ''}
            </div>`;
    });
}

socket.on('errorMsg', (msg) => alert(msg));