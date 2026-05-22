const socket = io();
let pendingCode = null;

// Botones +/-
window.changeValue = function(type, delta) {
    const id = type === 'players' ? 'val-players' : 'val-impostors';
    const el = document.getElementById(id);
    let val = parseInt(el.innerText);
    val = type === 'players' ? Math.min(30, Math.max(1, val + delta)) : Math.min(15, Math.max(1, val + delta));
    el.innerText = val;
};

// Abrir Modal para CREAR
document.getElementById('btn-create').onclick = () => {
    pendingCode = null;
    document.getElementById('modal-name').classList.remove('hidden');
};

// Abrir Modal para UNIRSE
document.getElementById('btn-join').onclick = () => {
    const code = document.getElementById('room-code').value.trim();
    if (code.length === 6) {
        pendingCode = code.toUpperCase();
        document.getElementById('modal-name').classList.remove('hidden');
    } else {
        alert("Escribe un código de 6 letras.");
    }
};

// Confirmar nombre en el Modal
document.getElementById('btn-confirm-name').onclick = () => {
    const name = document.getElementById('player-name-input').value.trim();
    if (!name) return alert("Poné un nombre.");

    if (pendingCode) {
        socket.emit('joinRoom', { username: name, code: pendingCode });
    } else {
        const p = document.getElementById('val-players').innerText;
        const i = document.getElementById('val-impostors').innerText;
        socket.emit('createRoom', { username: name, players: parseInt(p), impostors: parseInt(i) });
    }
    document.getElementById('modal-name').classList.add('hidden');
};

// Eventos de Socket
socket.on('roomCreated', (data) => {
    document.getElementById('screen-login').classList.add('hidden');
    document.getElementById('screen-lobby').classList.remove('hidden');
    document.getElementById('display-room-code').innerText = data.code;
    updateGrid(data.players);
});

socket.on('updatePlayerList', (players) => {
    updateGrid(players);
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