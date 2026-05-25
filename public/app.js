const socket = io();
let currentRoomCode = null;
let myRole = null;
let myWord = "";

const savedName = localStorage.getItem('player_name');
const savedCode = localStorage.getItem('room_code');
if (savedName && savedCode) { socket.emit('joinRoom', { username: savedName, code: savedCode }); }

window.changeValue = function(type, delta) {
    const id = type === 'players' ? 'val-players' : 'val-impostors';
    const el = document.getElementById(id);
    let val = parseInt(el.innerText);
    // NUEVO: Igualamos el máximo a 30 en los dos contadores
    val = type === 'players' ? Math.min(30, Math.max(3, val + delta)) : Math.min(30, Math.max(1, val + delta));
    el.innerText = val;
};

document.getElementById('btn-create').onclick = () => { window.isCreating = true; document.getElementById('modal-name').classList.remove('hidden'); };
document.getElementById('btn-join').onclick = () => {
    const code = document.getElementById('room-code').value.trim().toUpperCase();
    if (code.length === 6) { localStorage.setItem('room_code', code); window.isCreating = false; document.getElementById('modal-name').classList.remove('hidden'); }
    else { alert("CÓDIGO INVÁLIDO"); }
};

document.getElementById('btn-confirm-name').onclick = () => {
    const name = document.getElementById('player-name-input').value.trim();
    if (!name) return alert("ELEGÍ UN NOMBRE");
    localStorage.setItem('player_name', name);
    if (window.isCreating) {
        const p = document.getElementById('val-players').innerText;
        const i = document.getElementById('val-impostors').innerText;
        socket.emit('createRoom', { username: name, players: parseInt(p), impostors: parseInt(i) });
    } else { socket.emit('joinRoom', { username: name, code: localStorage.getItem('room_code') }); }
    document.getElementById('modal-name').classList.add('hidden');
};

document.getElementById('btn-start').onclick = () => { if (currentRoomCode) socket.emit('startGame', currentRoomCode); };

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
    myRole = data.role;
    myWord = data.palabra;
    renderGame(data);
});

socket.on('wordBStatusUpdate', (visible) => {
    const btn = document.getElementById('btn-toggle-word');
    if (btn) {
        btn.innerText = visible ? "DESACTIVAR PALABRA B" : "ACTIVAR PALABRA B";
        btn.style.background = visible ? "#f44336" : "#4caf50";
    }
    
    if (myRole === 'IMPOSTOR') {
        const wordEl = document.getElementById('display-word-text');
        if (wordEl) {
            wordEl.innerText = visible ? myWord.toUpperCase() : "???";
            wordEl.classList.toggle('disabled-word', !visible);
        }
    }
});

function renderGame(data) {
    document.getElementById('screen-login').classList.add('hidden');
    document.getElementById('screen-lobby').classList.add('hidden');
    document.getElementById('screen-game').classList.remove('hidden');
    const content = document.getElementById('game-content');

    if (data.role === 'ADMIN') {
        content.innerHTML = `
            <div class="admin-dashboard">
                <div class="admin-window">
                    <h4 class="window-title">JUGADORES</h4>
                    <div class="admin-scroll-list">
                        ${data.allPlayers.filter(p => p.role !== 'ADMIN').map(p => `
                            <div class="player-row-item" id="row-${p.id}" onclick="toggleEliminar('${p.id}')">
                                <span class="status-indicator"></span>
                                <span class="player-label">${p.username.toUpperCase()}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="admin-window">
                    <h4 class="window-title">INFO SECRETA</h4>
                    <div class="secret-data-box">
                        <small>PALABRAS</small>
                        <p class="reveal-text">${data.palabra}</p>
                    </div>
                    <div class="secret-data-box">
                        <small>IMPOSTORES (${data.count})</small>
                        <div class="impostor-tags">
                            ${data.allPlayers.filter(p => p.role === 'IMPOSTOR').map(p => `<div>• ${p.username.toUpperCase()}</div>`).join('')}
                        </div>
                        <div class="adjust-impostors-box">
                            <button class="btn-primary btn-sm" onclick="changeImpostorsInGame(-1)">- 1</button>
                            <button class="btn-primary btn-sm" onclick="changeImpostorsInGame(1)">+ 1</button>
                        </div>
                    </div>
                    <button id="btn-toggle-word" class="btn-primary" onclick="toggleWordB()" style="padding:10px; font-size:0.6rem; background: ${data.wordBVisible ? '#f44336' : '#4caf50'}">
                        ${data.wordBVisible ? 'DESACTIVAR PALABRA B' : 'ACTIVAR PALABRA B'}
                    </button>
                </div>
                <div class="admin-window" style="grid-column: span 2; height: auto; gap: 10px;">
                    <h4 class="window-title">PALABRAS PERSONALIZADAS</h4>
                    <div style="display: flex; gap: 8px;">
                        <input type="text" id="custom-word-a" placeholder="Palabra A (Detective)" maxlength="20">
                        <input type="text" id="custom-word-b" placeholder="Palabra B (Impostor)" maxlength="20">
                    </div>
                    <button class="btn-primary" onclick="sendCustomWords()" style="padding: 12px; font-size: 0.75rem;">JUGAR CON ESTAS PALABRAS</button>
                </div>
            </div>
            <button class="btn-primary" onclick="nextRound()" style="margin-top:10px">NUEVA RONDA ALEATORIA</button>
            <button class="btn-primary" onclick="reassignRoles()" style="margin-top:10px; background: #3f51b5;">REASIGNAR ROLES</button>
            <button onclick="leaveRoom()" class="btn-link-exit">CERRAR PARTIDA</button>
        `;
    } else {
        const impostorWordDisplay = (data.role === 'IMPOSTOR' && !data.wordBVisible) ? "???" : data.palabra.toUpperCase();
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
                        <h1 id="display-word-text" class="word-highlight ${(!data.wordBVisible && data.role === 'IMPOSTOR') ? 'disabled-word' : ''}">${impostorWordDisplay}</h1>
                    </div>
                </div>
                <button class="btn-primary" onclick="setReady()">¡LISTO!</button>
            </div>
            <div id="game-phase-debate" class="hidden">
                <div class="setup-box" style="text-align:center">
                    <h2 class="highlight-text">DEBATE</h2>
                    <p style="font-size:0.7rem; color:#8e90a5">Moderador supervisando...</p>
                    <div class="divider"></div>
                    <button onclick="leaveRoom()" class="btn-link-exit">SALIR AL MENÚ</button>
                </div>
            </div>
        `;
    }
}

window.toggleEliminar = (id) => document.getElementById(`row-${id}`).classList.toggle('eliminado');
window.toggleVisibility = (id) => document.getElementById(id).classList.toggle('revealed');
window.setReady = () => { document.getElementById('game-phase-reveal').classList.add('hidden'); document.getElementById('game-phase-debate').classList.remove('hidden'); };
window.nextRound = () => socket.emit('nextRound', currentRoomCode);
window.leaveRoom = () => { localStorage.clear(); location.reload(); };
window.sendCustomWords = () => {
    const palabraA = document.getElementById('custom-word-a').value.trim();
    const palabraB = document.getElementById('custom-word-b').value.trim();
    if (!palabraA || !palabraB) return alert("ESCRIBÍ AMBAS PALABRAS");
    socket.emit('startCustomRound', { code: currentRoomCode, palabraA, palabraB });
};
window.reassignRoles = () => { if (currentRoomCode) socket.emit('reassignRoles', currentRoomCode); };
window.toggleWordB = () => { if (currentRoomCode) socket.emit('toggleWordB', currentRoomCode); };

// NUEVO: Emitir el cambio de cantidad de impostores
window.changeImpostorsInGame = (delta) => { 
    if (currentRoomCode) socket.emit('changeImpostorCount', { code: currentRoomCode, delta }); 
};

function updateGrid(players) {
    const grid = document.getElementById('players-grid'); grid.innerHTML = '';
    players.forEach((p, index) => {
        const isMe = p.username === localStorage.getItem('player_name');
        grid.innerHTML += `<div class="player-card ${index === 0 ? 'host' : ''}">
            <div class="player-name">${p.username.toUpperCase()} ${isMe ? '(TÚ)' : ''}</div>
            ${index === 0 ? '<div class="host-badge">MODERADOR</div>' : ''}
        </div>`;
    });
}
socket.on('errorMsg', (msg) => alert(msg));