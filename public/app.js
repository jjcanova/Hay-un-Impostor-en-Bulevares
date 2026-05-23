const socket = io();
let currentRoomCode = null;

// RECONEXIÓN AUTOMÁTICA
const savedName = localStorage.getItem('player_name');
const savedCode = localStorage.getItem('room_code');
if (savedName && savedCode) {
    socket.emit('joinRoom', { username: savedName, code: savedCode });
}

window.changeValue = function(type, delta) {
    const id = type === 'players' ? 'val-players' : 'val-impostors';
    const el = document.getElementById(id);
    let val = parseInt(el.innerText);
    val = type === 'players' ? Math.min(30, Math.max(3, val + delta)) : Math.min(15, Math.max(1, val + delta));
    el.innerText = val;
};

document.getElementById('btn-create').onclick = () => {
    window.isCreating = true;
    document.getElementById('modal-name').classList.remove('hidden');
};

document.getElementById('btn-join').onclick = () => {
    const code = document.getElementById('room-code').value.trim().toUpperCase();
    if (code.length === 6) {
        localStorage.setItem('room_code', code);
        window.isCreating = false;
        document.getElementById('modal-name').classList.remove('hidden');
    } else { alert("CÓDIGO INVÁLIDO"); }
};

document.getElementById('btn-confirm-name').onclick = () => {
    const name = document.getElementById('player-name-input').value.trim();
    if (!name) return alert("ELEGÍ UN NOMBRE");
    localStorage.setItem('player_name', name);
    if (window.isCreating) {
        const p = document.getElementById('val-players').innerText;
        const i = document.getElementById('val-impostors').innerText;
        socket.emit('createRoom', { username: name, players: parseInt(p), impostors: parseInt(i) });
    } else {
        socket.emit('joinRoom', { username: name, code: localStorage.getItem('room_code') });
    }
    document.getElementById('modal-name').classList.add('hidden');
};

document.getElementById('btn-start').onclick = () => {
    if (currentRoomCode) socket.emit('startGame', currentRoomCode);
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

socket.on('gameStarted', (data) => renderGame(data));

function renderGame(data) {
    document.getElementById('screen-login').classList.add('hidden');
    document.getElementById('screen-lobby').classList.add('hidden');
    document.getElementById('screen-game').classList.remove('hidden');
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
            <div class="setup-box" style="text-align:center">
                <h2 class="highlight-text">DEBATE</h2>
                <div class="divider"></div>
                ${data.isHost ? `<button class="btn-primary" onclick="nextRound()">SIGUIENTE RONDA</button>` : `<p>Debatiendo...</p>`}
                <button onclick="leaveRoom()" class="btn-link-exit">SALIR AL MENÚ</button>
            </div>
        </div>
    `;
}

window.toggleVisibility = (id) => document.getElementById(id).classList.toggle('revealed');
window.setReady = () => {
    document.getElementById('game-phase-reveal').classList.add('hidden');
    document.getElementById('game-phase-debate').classList.remove('hidden');
};
window.nextRound = () => socket.emit('nextRound', currentRoomCode);
window.leaveRoom = () => { localStorage.clear(); location.reload(); };

function updateGrid(players) {
    const grid = document.getElementById('players-grid');
    grid.innerHTML = '';
    players.forEach((p, index) => {
        const isMe = p.id === socket.id || p.username === localStorage.getItem('player_name');
        grid.innerHTML += `<div class="player-card ${index === 0 ? 'host' : ''}">
            <div class="player-name">${p.username.toUpperCase()} ${isMe ? '(TÚ)' : ''}</div>
            ${index === 0 ? '<div class="host-badge">HOST</div>' : ''}
        </div>`;
    });
}
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
socket.on('errorMsg', (msg) => alert(msg));