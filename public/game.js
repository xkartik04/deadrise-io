// ==========================================
// CYBER NITRO: COMBAT RACER - GAME ENGINE
// ==========================================

const socket = io();

// State
let myPlayerId = null;
let currentRoomCode = null;
let isHost = false;
let myColor = '#00f0ff';
let myName = 'Pilot';
let trackData = null;
let latestSnapshot = null;
let soundEnabled = true;

// DOM Screens
const screens = {
  home: document.getElementById('screen-home'),
  lobby: document.getElementById('screen-lobby'),
  game: document.getElementById('screen-game'),
  gameover: document.getElementById('screen-gameover')
};

// Canvas & Contexts
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const minimapCanvas = document.getElementById('minimap-canvas');
const minimapCtx = minimapCanvas.getContext('2d');
const previewCanvas = document.getElementById('car-preview-canvas');
const previewCtx = previewCanvas.getContext('2d');

// HUD Elements
const hud = {
  pos: document.getElementById('hud-position'),
  lap: document.getElementById('hud-lap'),
  kills: document.getElementById('hud-kills'),
  speed: document.getElementById('speed-display'),
  nitroFill: document.getElementById('nitro-fill'),
  shieldFill: document.getElementById('shield-fill'),
  healthFill: document.getElementById('health-fill'),
  weaponName: document.getElementById('weapon-name'),
  weaponAmmo: document.getElementById('weapon-ammo'),
  killFeed: document.getElementById('kill-feed'),
  countdownBanner: document.getElementById('countdown-banner'),
  countdownNum: document.getElementById('countdown-num')
};

// Particles & Effects
let particles = [];
let skidmarks = [];
let screenShake = 0;
let camera = { x: 0, y: 0 };

// Player Inputs
const inputs = {
  up: false,
  down: false,
  left: false,
  right: false,
  boost: false,
  shoot: false,
  drift: false
};

// Resize Canvas
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// --- 🔊 PROCEDURAL AUDIO SYNTHESIZER ---
class AudioEngine {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
  }

  playShoot(type = 'gatling') {
    if (!soundEnabled) return;
    this.init();
    if (!this.ctx) return;

    if (type === 'rocket') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.3);
    } else {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(450, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.08);
    }
  }

  playExplosion() {
    if (!soundEnabled) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.6, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.4);
  }

  playPickup() {
    if (!soundEnabled) return;
    this.init();
    if (!this.ctx) return;
    const freqs = [523.25, 659.25, 783.99, 1046.50];
    freqs.forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, this.ctx.currentTime + i * 0.05);
      gain.gain.setValueAtTime(0.15, this.ctx.currentTime + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + i * 0.05 + 0.1);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(this.ctx.currentTime + i * 0.05);
      osc.stop(this.ctx.currentTime + i * 0.05 + 0.1);
    });
  }

  playBeep(isHigh = false) {
    if (!soundEnabled) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(isHigh ? 880 : 440, this.ctx.currentTime);
    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }
}

const audio = new AudioEngine();

// --- 📱 LIGHTWEIGHT QR CODE RENDERER ---
function renderQRCode(canvasId, text) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const size = 140;
  canvas.width = size;
  canvas.height = size;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }

  const gridSize = 21;
  const cellSize = Math.floor((size - 16) / gridSize);
  const offset = Math.floor((size - (cellSize * gridSize)) / 2);

  ctx.fillStyle = '#070814';

  function drawFinder(r, c) {
    for (let x = 0; x < 7; x++) {
      for (let y = 0; y < 7; y++) {
        if (x === 0 || x === 6 || y === 0 || y === 6 || (x >= 2 && x <= 4 && y >= 2 && y <= 4)) {
          ctx.fillRect(offset + (c + x) * cellSize, offset + (r + y) * cellSize, cellSize, cellSize);
        }
      }
    }
  }

  drawFinder(0, 0);
  drawFinder(0, gridSize - 7);
  drawFinder(gridSize - 7, 0);

  let seed = Math.abs(hash);
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const isFinder = (r < 8 && c < 8) || (r < 8 && c >= gridSize - 8) || (r >= gridSize - 8 && c < 8);
      if (!isFinder) {
        seed = (seed * 9301 + 49297) % 233280;
        if (seed % 2 === 0) {
          ctx.fillRect(offset + c * cellSize, offset + r * cellSize, cellSize, cellSize);
        }
      }
    }
  }
}

// --- SCREEN SWITCHER ---
function showScreen(name) {
  Object.keys(screens).forEach(k => screens[k].classList.remove('active'));
  if (screens[name]) screens[name].classList.add('active');
}

// --- CAR PREVIEW IN GARAGE ---
function drawCarPreview() {
  previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
  const cx = previewCanvas.width / 2;
  const cy = previewCanvas.height / 2;

  previewCtx.save();
  previewCtx.translate(cx, cy);

  // Neon Underglow
  previewCtx.shadowColor = myColor;
  previewCtx.shadowBlur = 20;

  // Car Body Chassis
  previewCtx.fillStyle = myColor;
  previewCtx.fillRect(-22, -12, 44, 24);

  // Cockpit Glass
  previewCtx.fillStyle = '#070814';
  previewCtx.fillRect(-6, -8, 16, 16);

  // Twin Plasma Cannons
  previewCtx.fillStyle = '#94a3b8';
  previewCtx.fillRect(16, -10, 10, 4);
  previewCtx.fillRect(16, 6, 10, 4);

  // Wheels
  previewCtx.fillStyle = '#1e293b';
  previewCtx.fillRect(-18, -16, 10, 5);
  previewCtx.fillRect(8, -16, 10, 5);
  previewCtx.fillRect(-18, 11, 10, 5);
  previewCtx.fillRect(8, 11, 10, 5);

  previewCtx.restore();
}
drawCarPreview();

// Color selection
document.querySelectorAll('.color-dot').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.color-dot').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    myColor = btn.dataset.color;
    drawCarPreview();
  });
});

// URL Auto Join
window.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const room = urlParams.get('room');
  if (room) {
    const input = document.getElementById('join-room-input');
    if (input) input.value = room.toUpperCase();
  }
});

// --- LOBBY & HOSTING HANDLERS ---
document.getElementById('create-btn').addEventListener('click', () => {
  myName = document.getElementById('player-name-input').value.trim() || 'ApexHost';
  audio.init();
  socket.emit('create_room', { playerName: myName, carColor: myColor });
});

document.getElementById('join-btn').addEventListener('click', () => {
  const code = document.getElementById('join-room-input').value.trim().toUpperCase();
  myName = document.getElementById('player-name-input').value.trim() || `Pilot_${Math.floor(Math.random() * 900 + 100)}`;
  if (!code) {
    alert('Please enter a 4-letter Room Code!');
    return;
  }
  audio.init();
  socket.emit('join_room', { roomCode: code, playerName: myName, carColor: myColor });
});

document.getElementById('add-bot-btn').addEventListener('click', () => {
  socket.emit('add_bot');
});

document.getElementById('start-race-btn').addEventListener('click', () => {
  socket.emit('start_game');
});

document.getElementById('copy-url-btn').addEventListener('click', () => {
  if (!currentRoomCode) return;
  const joinUrl = `${window.location.origin}/?room=${currentRoomCode}`;
  navigator.clipboard.writeText(joinUrl).then(() => {
    const btn = document.getElementById('copy-url-btn');
    btn.textContent = '✅ Copied!';
    setTimeout(() => { btn.textContent = '📋 Copy Invite Link'; }, 2000);
  });
});

document.getElementById('rematch-btn').addEventListener('click', () => {
  socket.emit('start_game');
});

document.getElementById('exit-btn').addEventListener('click', () => {
  window.location.href = '/';
});

// --- KEYBOARD INPUT DISPATCHER ---
const keyMap = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  ShiftLeft: 'boost', ShiftRight: 'boost',
  Space: 'shoot',
  KeyE: 'drift', KeyC: 'drift'
};

window.addEventListener('keydown', (e) => {
  if (keyMap[e.code]) {
    inputs[keyMap[e.code]] = true;
    socket.emit('player_input', inputs);
  }
});

window.addEventListener('keyup', (e) => {
  if (keyMap[e.code]) {
    inputs[keyMap[e.code]] = false;
    socket.emit('player_input', inputs);
  }
});

// --- TOUCH BUTTON CONTROLS (MOBILE) ---
function setupTouchButton(id, inputKey) {
  const btn = document.getElementById(id);
  if (!btn) return;

  const start = (e) => {
    e.preventDefault();
    inputs[inputKey] = true;
    socket.emit('player_input', inputs);
  };
  const end = (e) => {
    e.preventDefault();
    inputs[inputKey] = false;
    socket.emit('player_input', inputs);
  };

  btn.addEventListener('touchstart', start, { passive: false });
  btn.addEventListener('touchend', end, { passive: false });
  btn.addEventListener('mousedown', start);
  btn.addEventListener('mouseup', end);
}

setupTouchButton('touch-left', 'left');
setupTouchButton('touch-right', 'right');
setupTouchButton('touch-gas', 'up');
setupTouchButton('touch-brake', 'down');
setupTouchButton('touch-nitro', 'boost');
setupTouchButton('touch-shoot', 'shoot');
setupTouchButton('touch-drift', 'drift');

// --- SOCKET EVENTS ---
socket.on('room_created', ({ roomCode, player, track }) => {
  currentRoomCode = roomCode;
  myPlayerId = player.id;
  isHost = true;
  trackData = track;
  setupLobby(roomCode, [player], true);
});

socket.on('room_joined', ({ roomCode, player, track }) => {
  currentRoomCode = roomCode;
  myPlayerId = player.id;
  isHost = player.isHost;
  trackData = track;
  setupLobby(roomCode, [player], isHost);
});

socket.on('player_joined_lobby', ({ players }) => {
  updatePilotRoster(players);
});

socket.on('join_error', ({ message }) => {
  alert(message);
});

socket.on('countdown_start', ({ countdown }) => {
  showScreen('game');
  hud.countdownBanner.classList.remove('hidden');
  hud.countdownNum.textContent = countdown;
  audio.playBeep(false);
});

socket.on('countdown_tick', ({ countdown }) => {
  if (countdown <= 0) {
    hud.countdownNum.textContent = 'GO! 🔥';
    audio.playBeep(true);
    setTimeout(() => {
      hud.countdownBanner.classList.add('hidden');
    }, 1000);
  } else {
    hud.countdownNum.textContent = countdown;
    audio.playBeep(false);
  }
});

socket.on('game_tick', (snapshot) => {
  latestSnapshot = snapshot;

  // Handle SFX events from server
  if (snapshot.events) {
    snapshot.events.forEach(ev => {
      if (ev.type === 'shoot') {
        audio.playShoot(ev.weapon);
      } else if (ev.type === 'explosion') {
        audio.playExplosion();
        screenShake = 15;
        spawnExplosionParticles(ev.x, ev.y);
      } else if (ev.type === 'powerup') {
        audio.playPickup();
      } else if (ev.type === 'kill') {
        addKillFeedMessage(`💀 ${ev.killerName} blasted ${ev.victimName}!`);
      }
    });
  }
});

socket.on('game_over', (leaderboard) => {
  showScreen('gameover');
  audio.playPickup();

  const tbody = document.getElementById('results-table-body');
  tbody.innerHTML = '';

  leaderboard.forEach(row => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="color:var(--gold); font-weight:900;">#${row.rank}</td>
      <td style="color:${row.color}; font-weight:800;">${row.name}</td>
      <td style="color:var(--pink);">${row.kills} 💀</td>
      <td style="color:var(--cyan); font-family:var(--font-title);">${row.finishTime}</td>
    `;
    tbody.appendChild(tr);
  });
});

function setupLobby(roomCode, players, amHost) {
  document.getElementById('lobby-code-display').textContent = roomCode;
  const hostPanel = document.getElementById('host-panel');
  const guestWaiting = document.getElementById('guest-waiting');

  if (amHost) {
    hostPanel.classList.remove('hidden');
    guestWaiting.classList.add('hidden');
  } else {
    hostPanel.classList.add('hidden');
    guestWaiting.classList.remove('hidden');
  }

  const joinUrl = `${window.location.origin}/?room=${roomCode}`;
  renderQRCode('qr-canvas', joinUrl);

  updatePilotRoster(players);
  showScreen('lobby');
}

function updatePilotRoster(players) {
  const countSpan = document.getElementById('pilot-count');
  const list = document.getElementById('pilots-list');
  if (!list) return;

  countSpan.textContent = players.length;
  list.innerHTML = '';

  players.forEach(p => {
    const row = document.createElement('div');
    row.className = 'pilot-row';
    row.style.borderLeftColor = p.color;
    row.innerHTML = `
      <span style="font-weight:800; color:${p.color};">${p.name}</span>
      <span style="font-size:0.75rem; color:#94a3b8;">${p.isBot ? '🤖 AI RACER' : (p.isHost ? '👑 HOST' : 'PILOT')}</span>
    `;
    list.appendChild(row);
  });
}

function addKillFeedMessage(text) {
  const msg = document.createElement('div');
  msg.className = 'kill-msg';
  msg.textContent = text;
  hud.killFeed.appendChild(msg);
  setTimeout(() => msg.remove(), 4000);
}

function spawnExplosionParticles(x, y) {
  for (let i = 0; i < 25; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 8 + 2;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: Math.random() * 8 + 4,
      color: ['#ffb703', '#ff007f', '#00f0ff', '#ffffff'][Math.floor(Math.random() * 4)],
      life: 40
    });
  }
}

// --- 🎮 MAIN 60 FPS RENDER LOOP ---
function renderLoop() {
  requestAnimationFrame(renderLoop);

  if (!latestSnapshot || !trackData || !screens.game.classList.contains('active')) return;

  // Find my car
  const myCar = latestSnapshot.cars.find(c => c.id === myPlayerId) || latestSnapshot.cars[0];

  // Camera Follow
  if (myCar) {
    camera.x += (myCar.x - canvas.width / 2 - camera.x) * 0.1;
    camera.y += (myCar.y - canvas.height / 2 - camera.y) * 0.1;

    // Update HUD
    hud.speed.textContent = Math.round(Math.abs(myCar.speed) * 18);
    hud.nitroFill.style.width = `${myCar.nitro}%`;
    hud.shieldFill.style.width = `${(myCar.shield / 50) * 100}%`;
    hud.healthFill.style.width = `${myCar.health}%`;
    hud.lap.textContent = Math.min(3, myCar.lap);
    hud.kills.textContent = `${myCar.kills} 💀`;

    hud.weaponName.textContent = myCar.weaponType.toUpperCase();
    hud.weaponAmmo.textContent = myCar.weaponType === 'gatling' ? '∞ AMMO' : `${myCar.specialAmmo} SHOTS`;

    // Calculate rank
    const sorted = [...latestSnapshot.cars].sort((a, b) => b.lap - a.lap || b.currentCheckpoint - a.currentCheckpoint);
    const myRank = sorted.findIndex(c => c.id === myCar.id) + 1;
    const suffix = myRank === 1 ? '1st' : (myRank === 2 ? '2nd' : (myRank === 3 ? '3rd' : `${myRank}th`));
    hud.pos.textContent = suffix;
  }

  // Clear Screen
  ctx.fillStyle = '#060814';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  // Screen Shake
  if (screenShake > 0) {
    ctx.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake);
    screenShake *= 0.88;
  }
  ctx.translate(-camera.x, -camera.y);

  // 1. Draw Asphalt Track & Grid Background
  drawTrack();

  // 2. Draw Skidmarks
  drawSkidmarks();

  // 3. Draw Boost Pads
  trackData.boostPads.forEach(pad => {
    ctx.save();
    ctx.translate(pad.x, pad.y);
    ctx.rotate(pad.angle);
    ctx.fillStyle = 'rgba(0, 240, 255, 0.25)';
    ctx.fillRect(-pad.w / 2, -pad.h / 2, pad.w, pad.h);
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(-pad.w / 2, -pad.h / 2, pad.w, pad.h);

    // Animated chevron arrows
    ctx.fillStyle = '#00f0ff';
    ctx.beginPath();
    ctx.moveTo(10, 0); ctx.lineTo(-10, -15); ctx.lineTo(-10, 15);
    ctx.fill();
    ctx.restore();
  });

  // 4. Draw Powerups
  latestSnapshot.powerups.forEach(p => {
    if (p.active) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.shadowColor = '#ffb703';
      ctx.shadowBlur = 15;
      ctx.fillStyle = '#ffb703';
      ctx.fillRect(-15, -15, 30, 30);
      ctx.fillStyle = '#070814';
      ctx.font = 'bold 14px Orbitron';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const icon = p.type === 'rocket' ? '🚀' : (p.type === 'laser' ? '⚡' : (p.type === 'nitro' ? '🔥' : (p.type === 'shield' ? '🛡️' : '🔧')));
      ctx.fillText(icon, 0, 0);
      ctx.restore();
    }
  });

  // 5. Draw Projectiles
  latestSnapshot.projectiles.forEach(proj => {
    ctx.save();
    ctx.translate(proj.x, proj.y);
    ctx.rotate(proj.angle);
    ctx.shadowColor = proj.color;
    ctx.shadowBlur = 12;
    ctx.fillStyle = proj.color;

    if (proj.type === 'rocket') {
      ctx.fillRect(-12, -4, 24, 8);
      ctx.fillStyle = '#ff3366';
      ctx.fillRect(-16, -2, 4, 4);
    } else if (proj.type === 'mine') {
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(-8, -2, 16, 4);
    }
    ctx.restore();
  });

  // 6. Draw Combat Cars
  latestSnapshot.cars.forEach(car => {
    if (car.health <= 0) return;

    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);

    // Nitro Thruster Flame
    if (car.isBoosting) {
      ctx.fillStyle = '#ffb703';
      ctx.beginPath();
      ctx.moveTo(-car.width / 2, -6);
      ctx.lineTo(-car.width / 2 - (Math.random() * 20 + 15), 0);
      ctx.lineTo(-car.width / 2, 6);
      ctx.fill();
    }

    // Car Neon Underglow
    ctx.shadowColor = car.color;
    ctx.shadowBlur = 15;

    // Body
    ctx.fillStyle = car.color;
    ctx.fillRect(-car.width / 2, -car.height / 2, car.width, car.height);

    // Armor Details
    ctx.fillStyle = '#070814';
    ctx.fillRect(-6, -6, 14, 12);

    // Cannons
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(car.width / 2 - 4, -8, 12, 3);
    ctx.fillRect(car.width / 2 - 4, 5, 12, 3);

    // Wheels
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-car.width / 2 + 2, -car.height / 2 - 4, 8, 4);
    ctx.fillRect(car.width / 2 - 10, -car.height / 2 - 4, 8, 4);
    ctx.fillRect(-car.width / 2 + 2, car.height / 2, 8, 4);
    ctx.fillRect(car.width / 2 - 10, car.height / 2, 8, 4);

    ctx.restore();

    // Health / Shield Bar above car
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(car.x - 22, car.y - 30, 44, 5);
    ctx.fillStyle = car.color;
    ctx.fillRect(car.x - 22, car.y - 30, (car.health / 100) * 44, 5);

    // Name Label
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px Rajdhani';
    ctx.textAlign = 'center';
    ctx.fillText(car.name, car.x, car.y - 34);
  });

  // 7. Draw Particles
  particles = particles.filter(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, p.size, p.size);
    return p.life > 0;
  });

  ctx.restore();

  // 8. Render Radar Minimap
  renderMinimap();
}

function drawTrack() {
  // Center Obstacle Island
  trackData.obstacles.forEach(obs => {
    ctx.fillStyle = 'rgba(20, 26, 54, 0.9)';
    ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 3;
    ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);
  });

  // Checkpoint Line Indicators
  trackData.checkpoints.forEach((cp, idx) => {
    ctx.strokeStyle = idx === 0 ? 'rgba(255, 183, 3, 0.4)' : 'rgba(0, 240, 255, 0.15)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cp.x, cp.y, cp.radius, 0, Math.PI * 2);
    ctx.stroke();
  });
}

function drawSkidmarks() {
  if (latestSnapshot.cars) {
    latestSnapshot.cars.forEach(car => {
      if (car.isDrifting) {
        skidmarks.push({ x: car.x, y: car.y, life: 120 });
      }
    });
  }
  skidmarks = skidmarks.filter(s => {
    s.life--;
    ctx.fillStyle = `rgba(0, 0, 0, ${s.life / 200})`;
    ctx.fillRect(s.x - 3, s.y - 3, 6, 6);
    return s.life > 0;
  });
}

function renderMinimap() {
  minimapCtx.fillStyle = 'rgba(7, 8, 20, 0.9)';
  minimapCtx.fillRect(0, 0, minimapCanvas.width, minimapCanvas.height);

  const scaleX = minimapCanvas.width / trackData.width;
  const scaleY = minimapCanvas.height / trackData.height;

  // Draw Arena Bounds
  minimapCtx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
  minimapCtx.strokeRect(2, 2, minimapCanvas.width - 4, minimapCanvas.height - 4);

  // Draw Cars on Radar
  latestSnapshot.cars.forEach(car => {
    minimapCtx.fillStyle = car.color;
    minimapCtx.beginPath();
    minimapCtx.arc(car.x * scaleX, car.y * scaleY, car.id === myPlayerId ? 4 : 2.5, 0, Math.PI * 2);
    minimapCtx.fill();
  });
}

// Start Render Engine
renderLoop();
