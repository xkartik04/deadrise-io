// ==========================================
// DEADRISE.IO / DEADSHOT.IO - CLIENT ENGINE
// ==========================================

const socket = io();

// State
let myPlayerId = null;
let currentRoomCode = null;
let isHost = false;
let myName = 'Striker';
let myColor = '#00f0ff';
let selectedMode = 'DEADSHOT_PVP';
let mapData = null;
let latestSnapshot = null;
let soundEnabled = true;

// Screens
const screens = {
  home: document.getElementById('screen-home'),
  lobby: document.getElementById('screen-lobby'),
  game: document.getElementById('screen-game')
};

// Canvas
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const minimapCanvas = document.getElementById('minimap-canvas');
const minimapCtx = minimapCanvas.getContext('2d');

// HUD Elements
const hud = {
  modeTitle: document.getElementById('hud-mode-title'),
  waveTitle: document.getElementById('hud-wave-title'),
  leaderboard: document.getElementById('hud-leaderboard-list'),
  killFeed: document.getElementById('kill-feed-container'),
  waveBanner: document.getElementById('wave-banner'),
  waveBannerTitle: document.getElementById('wave-banner-title'),
  armorVal: document.getElementById('armor-val'),
  armorFill: document.getElementById('armor-fill'),
  healthVal: document.getElementById('health-val'),
  healthFill: document.getElementById('health-fill'),
  staminaFill: document.getElementById('stamina-fill'),
  weaponName: document.getElementById('weapon-name-display'),
  currentAmmo: document.getElementById('current-ammo'),
  maxAmmo: document.getElementById('max-ammo'),
  reloadIndicator: document.getElementById('reload-indicator'),
  shareBtn: document.getElementById('ingame-share-btn')
};

// Camera & Particles
let camera = { x: 0, y: 0 };
let particles = [];
let bloodSplatters = [];
let screenShake = 0;
let mousePos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

// Input States
const inputs = {
  up: false, down: false, left: false, right: false,
  shoot: false, sprint: false, reload: false,
  aimX: 0, aimY: 0
};

// Resize Canvas
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// --- 🔊 PROCEDURAL AUDIO SYNTHESIZER ---
class SoundSynth {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
  }

  playGunshot(weapon = 'assault') {
    if (!soundEnabled) return;
    this.init();
    if (!this.ctx) return;

    if (weapon === 'sniper') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(600, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.35);
      gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.35);
    } else if (weapon === 'shotgun') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(250, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.2);
    } else if (weapon === 'plasma') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.25);
    } else {
      // Assault Rifle
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(400, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.08);
    }
  }

  playHit() {
    if (!soundEnabled) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }

  playExplosion() {
    if (!soundEnabled) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(25, this.ctx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.6, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.4);
  }

  playReload() {
    if (!soundEnabled) return;
    this.init();
    if (!this.ctx) return;
    const freqs = [350, 700];
    freqs.forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, this.ctx.currentTime + i * 0.12);
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + i * 0.12 + 0.1);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(this.ctx.currentTime + i * 0.12);
      osc.stop(this.ctx.currentTime + i * 0.12 + 0.1);
    });
  }
}

const audio = new SoundSynth();

// --- 📱 LIGHTWEIGHT QR CODE GENERATOR ---
function renderQRCode(canvasId, text) {
  const c = document.getElementById(canvasId);
  if (!c) return;
  const cx = c.getContext('2d');
  const size = 140;
  c.width = size;
  c.height = size;

  cx.fillStyle = '#ffffff';
  cx.fillRect(0, 0, size, size);

  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }

  const gridSize = 21;
  const cellSize = Math.floor((size - 16) / gridSize);
  const offset = Math.floor((size - (cellSize * gridSize)) / 2);

  cx.fillStyle = '#07090e';

  function drawFinder(r, col) {
    for (let x = 0; x < 7; x++) {
      for (let y = 0; y < 7; y++) {
        if (x === 0 || x === 6 || y === 0 || y === 6 || (x >= 2 && x <= 4 && y >= 2 && y <= 4)) {
          cx.fillRect(offset + (col + x) * cellSize, offset + (r + y) * cellSize, cellSize, cellSize);
        }
      }
    }
  }

  drawFinder(0, 0);
  drawFinder(0, gridSize - 7);
  drawFinder(gridSize - 7, 0);

  let seed = Math.abs(hash);
  for (let r = 0; r < gridSize; r++) {
    for (let col = 0; col < gridSize; col++) {
      const isFinder = (r < 8 && col < 8) || (r < 8 && col >= gridSize - 8) || (r >= gridSize - 8 && col < 8);
      if (!isFinder) {
        seed = (seed * 9301 + 49297) % 233280;
        if (seed % 2 === 0) {
          cx.fillRect(offset + col * cellSize, offset + r * cellSize, cellSize, cellSize);
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

// --- SHARING URL UTILITY ---
function getShareUrl(code) {
  return `${window.location.origin}/?room=${code}`;
}

function copyShareLinkToClipboard() {
  if (!currentRoomCode) return;
  const url = getShareUrl(currentRoomCode);
  navigator.clipboard.writeText(url).then(() => {
    alert(`📋 Share Link Copied!\n${url}\nSend this to friends to join your match instantly!`);
  }).catch(() => {
    alert(`Invite URL: ${url}`);
  });
}

// Mode Selection
document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedMode = btn.dataset.mode;
  });
});

// Color Selection
document.querySelectorAll('.color-dot').forEach(dot => {
  dot.addEventListener('click', () => {
    document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('selected'));
    dot.classList.add('selected');
    myColor = dot.dataset.color;
  });
});

// URL Auto-Join Detection (e.g. ?room=ABCD)
window.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const room = urlParams.get('room');
  if (room) {
    const input = document.getElementById('join-room-input');
    if (input) input.value = room.toUpperCase();
    // Auto click join if URL contains room code!
    setTimeout(() => {
      document.getElementById('join-room-btn').click();
    }, 400);
  }
});

// --- MENU HANDLERS ---
document.getElementById('quick-play-btn').addEventListener('click', () => {
  myName = document.getElementById('player-name-input').value.trim() || 'GhostSniper';
  audio.init();
  socket.emit('create_room', { playerName: myName, playerColor: myColor, gameMode: selectedMode });
});

document.getElementById('join-room-btn').addEventListener('click', () => {
  const code = document.getElementById('join-room-input').value.trim().toUpperCase();
  myName = document.getElementById('player-name-input').value.trim() || `Striker_${Math.floor(Math.random() * 900 + 100)}`;
  if (!code) {
    alert('Please enter a 4-letter Room Code!');
    return;
  }
  audio.init();
  socket.emit('join_room', { roomCode: code, playerName: myName, playerColor: myColor });
});

document.getElementById('copy-share-link-btn').addEventListener('click', copyShareLinkToClipboard);
hud.shareBtn.addEventListener('click', copyShareLinkToClipboard);

document.getElementById('add-bot-btn').addEventListener('click', () => {
  socket.emit('add_bot');
});

document.getElementById('start-battle-btn').addEventListener('click', () => {
  socket.emit('start_game');
});

// --- CONTROLS & INPUT LISTENERS ---
window.addEventListener('mousemove', (e) => {
  mousePos.x = e.clientX;
  mousePos.y = e.clientY;
  inputs.aimX = mousePos.x + camera.x;
  inputs.aimY = mousePos.y + camera.y;
  socket.emit('player_input', inputs);
});

window.addEventListener('mousedown', (e) => {
  if (screens.game.classList.contains('active')) {
    inputs.shoot = true;
    socket.emit('player_input', inputs);
  }
});

window.addEventListener('mouseup', (e) => {
  inputs.shoot = false;
  socket.emit('player_input', inputs);
});

const keyMap = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  ShiftLeft: 'sprint', ShiftRight: 'sprint',
  KeyR: 'reload'
};

window.addEventListener('keydown', (e) => {
  if (keyMap[e.code]) {
    inputs[keyMap[e.code]] = true;
    if (e.code === 'KeyR') audio.playReload();
    socket.emit('player_input', inputs);
  }
});

window.addEventListener('keyup', (e) => {
  if (keyMap[e.code]) {
    inputs[keyMap[e.code]] = false;
    socket.emit('player_input', inputs);
  }
});

// Mobile Touch Control Bindings
function bindTouchBtn(id, inputKey) {
  const btn = document.getElementById(id);
  if (!btn) return;
  btn.addEventListener('touchstart', (e) => { e.preventDefault(); inputs[inputKey] = true; socket.emit('player_input', inputs); });
  btn.addEventListener('touchend', (e) => { e.preventDefault(); inputs[inputKey] = false; socket.emit('player_input', inputs); });
}
bindTouchBtn('btn-sprint-touch', 'sprint');
bindTouchBtn('btn-reload-touch', 'reload');
bindTouchBtn('btn-shoot-touch', 'shoot');

// --- SOCKET EVENT HANDLERS ---
socket.on('room_created', ({ roomCode, player, mode, map }) => {
  currentRoomCode = roomCode;
  myPlayerId = player.id;
  isHost = true;
  selectedMode = mode;
  mapData = map;
  setupLobby(roomCode, [player], true);
});

socket.on('room_joined', ({ roomCode, player, mode, map }) => {
  currentRoomCode = roomCode;
  myPlayerId = player.id;
  isHost = player.isHost;
  selectedMode = mode;
  mapData = map;
  setupLobby(roomCode, [player], isHost);
});

socket.on('lobby_update', ({ players }) => {
  updateRoster(players);
});

socket.on('join_error', ({ message }) => {
  alert(message);
});

socket.on('game_started', () => {
  showScreen('game');
  hud.modeTitle.textContent = selectedMode === 'DEADRISE_HORDE' ? 'DEADRISE HORDE 🧟' : 'DEADSHOT PvP 🎯';
  if (selectedMode === 'DEADRISE_HORDE') hud.waveTitle.classList.remove('hidden');
});

socket.on('game_tick', (snapshot) => {
  latestSnapshot = snapshot;

  // Process game events
  if (snapshot.events) {
    snapshot.events.forEach(ev => {
      if (ev.type === 'shoot') {
        audio.playGunshot(ev.weapon);
      } else if (ev.type === 'hit') {
        audio.playHit();
        spawnHitParticles(ev.x, ev.y);
      } else if (ev.type === 'explosion') {
        audio.playExplosion();
        screenShake = 16;
        spawnExplosion(ev.x, ev.y);
      } else if (ev.type === 'kill') {
        addKillMessage(`💀 ${ev.killerName} [${ev.weapon.toUpperCase()}] ${ev.victimName}`);
      } else if (ev.type === 'wave_clear') {
        triggerWaveBanner(ev.wave);
      }
    });
  }
});

function setupLobby(code, players, amHost) {
  document.getElementById('lobby-room-code').textContent = code;
  const hostButtons = document.getElementById('host-buttons');
  const guestWaiting = document.getElementById('guest-waiting-box');

  if (amHost) {
    hostButtons.classList.remove('hidden');
    guestWaiting.classList.add('hidden');
  } else {
    hostButtons.classList.add('hidden');
    guestWaiting.classList.remove('hidden');
  }

  // Render QR Code linking to sharing URL
  const shareUrl = getShareUrl(code);
  renderQRCode('qr-canvas', shareUrl);

  updateRoster(players);
  showScreen('lobby');
}

function updateRoster(players) {
  const count = document.getElementById('squad-count');
  const list = document.getElementById('lobby-roster-list');
  if (!list) return;

  count.textContent = players.length;
  list.innerHTML = '';

  players.forEach(p => {
    const item = document.createElement('div');
    item.className = 'roster-item';
    item.style.borderLeftColor = p.color;
    item.innerHTML = `
      <span style="color:${p.color};">${p.name}</span>
      <span style="font-size:0.75rem; color:#94a3b8;">${p.isBot ? '🤖 BOT' : (p.isHost ? '👑 LEADER' : 'SOLDIER')}</span>
    `;
    list.appendChild(item);
  });
}

function addKillMessage(text) {
  const el = document.createElement('div');
  el.className = 'kill-pill';
  el.textContent = text;
  hud.killFeed.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

function triggerWaveBanner(waveNum) {
  hud.waveBannerTitle.textContent = `WAVE ${waveNum}`;
  hud.waveBanner.classList.remove('hidden');
  setTimeout(() => hud.waveBanner.classList.add('hidden'), 2200);
}

function spawnHitParticles(x, y) {
  for (let i = 0; i < 6; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 6,
      size: Math.random() * 4 + 2,
      color: '#ff3366',
      life: 20
    });
  }
}

function spawnExplosion(x, y) {
  for (let i = 0; i < 30; i++) {
    const angle = Math.random() * Math.PI * 2;
    const spd = Math.random() * 10 + 2;
    particles.push({
      x, y,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd,
      size: Math.random() * 8 + 4,
      color: ['#00f59b', '#00f0ff', '#ffb703', '#ff007f'][Math.floor(Math.random() * 4)],
      life: 35
    });
  }
}

// --- 🎮 60 FPS RENDER LOOP ---
function renderLoop() {
  requestAnimationFrame(renderLoop);

  if (!latestSnapshot || !mapData || !screens.game.classList.contains('active')) return;

  const me = latestSnapshot.players.find(p => p.id === myPlayerId) || latestSnapshot.players[0];

  // Camera Follow
  if (me) {
    camera.x += (me.x - canvas.width / 2 - camera.x) * 0.12;
    camera.y += (me.y - canvas.height / 2 - camera.y) * 0.12;

    // Update HUD
    hud.armorVal.textContent = me.armor;
    hud.armorFill.style.width = `${(me.armor / 50) * 100}%`;
    hud.healthVal.textContent = me.health;
    hud.healthFill.style.width = `${me.health}%`;
    hud.staminaFill.style.width = `${me.stamina}%`;

    hud.weaponName.textContent = me.weapon.toUpperCase();
    hud.currentAmmo.textContent = me.ammo;
    hud.maxAmmo.textContent = me.weapon === 'shotgun' ? '/ 8' : (me.weapon === 'sniper' ? '/ 5' : (me.weapon === 'plasma' ? '/ 6' : '/ 30'));

    if (me.isReloading) {
      hud.reloadIndicator.classList.remove('hidden');
    } else {
      hud.reloadIndicator.classList.add('hidden');
    }

    if (latestSnapshot.wave) {
      hud.waveTitle.textContent = `WAVE ${latestSnapshot.wave}`;
    }

    // Leaderboard
    hud.leaderboard.innerHTML = '';
    const sorted = [...latestSnapshot.players].sort((a, b) => b.kills - a.kills || b.score - a.score);
    sorted.slice(0, 4).forEach((pl, idx) => {
      const row = document.createElement('div');
      row.className = 'lead-row';
      row.innerHTML = `<span style="color:${pl.color}">#${idx + 1} ${pl.name}</span><span>${pl.kills} 💀</span>`;
      hud.leaderboard.appendChild(row);
    });
  }

  // Clear Screen
  ctx.fillStyle = '#060810';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  if (screenShake > 0) {
    ctx.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake);
    screenShake *= 0.88;
  }
  ctx.translate(-camera.x, -camera.y);

  // 1. Draw Grid Map Terrain
  drawTerrain();

  // 2. Draw Obstacles / Buildings
  drawObstacles();

  // 3. Draw Powerups
  latestSnapshot.powerups.forEach(p => {
    if (p.active) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.fillStyle = '#ffb703';
      ctx.shadowColor = '#ffb703';
      ctx.shadowBlur = 12;
      ctx.fillRect(-14, -14, 28, 28);
      ctx.fillStyle = '#07090e';
      ctx.font = 'bold 12px Teko';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const icon = p.type === 'shotgun' ? 'SG' : (p.type === 'sniper' ? 'SNP' : (p.type === 'plasma' ? 'PLZ' : (p.type === 'medkit' ? '❤️' : '🛡️')));
      ctx.fillText(icon, 0, 0);
      ctx.restore();
    }
  });

  // 4. Draw Projectiles
  latestSnapshot.projectiles.forEach(pr => {
    ctx.save();
    ctx.translate(pr.x, pr.y);
    ctx.fillStyle = pr.color;
    ctx.shadowColor = pr.color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(0, 0, pr.weaponType === 'plasma' ? 8 : 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  // 5. Draw Zombies (if Horde Mode)
  if (latestSnapshot.zombies) {
    latestSnapshot.zombies.forEach(z => {
      ctx.save();
      ctx.translate(z.x, z.y);
      ctx.rotate(z.angle);

      // Zombie Body
      ctx.fillStyle = '#ff3366';
      ctx.shadowColor = '#ff3366';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fill();

      // Zombie Hands Reaching Out
      ctx.fillStyle = '#b00020';
      ctx.fillRect(12, -12, 10, 6);
      ctx.fillRect(12, 6, 10, 6);

      ctx.restore();

      // Health bar above zombie
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(z.x - 16, z.y - 26, 32, 4);
      ctx.fillStyle = '#ff3366';
      ctx.fillRect(z.x - 16, z.y - 26, (z.health / z.maxHealth) * 32, 4);
    });
  }

  // 6. Draw Players / Soldiers
  latestSnapshot.players.forEach(p => {
    if (p.health <= 0) return;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);

    // Player Body
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(0, 0, 20, 0, Math.PI * 2);
    ctx.fill();

    // Helmet Visor
    ctx.fillStyle = '#07090e';
    ctx.fillRect(4, -6, 10, 12);

    // Weapon in Hand
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(14, 6, 18, 5);

    ctx.restore();

    // Name & Health Tag
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px Chakra Petch';
    ctx.textAlign = 'center';
    ctx.fillText(p.name, p.x, p.y - 28);

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(p.x - 20, p.y - 24, 40, 4);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - 20, p.y - 24, (p.health / 100) * 40, 4);
  });

  // 7. Draw Particles
  particles = particles.filter(pt => {
    pt.x += pt.vx;
    pt.y += pt.vy;
    pt.life--;
    ctx.fillStyle = pt.color;
    ctx.fillRect(pt.x, pt.y, pt.size, pt.size);
    return pt.life > 0;
  });

  ctx.restore();

  // 8. Render Radar Minimap
  renderMinimap();
}

function drawTerrain() {
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 1;
  const gridSize = 80;
  for (let x = 0; x < mapData.width; x += gridSize) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, mapData.height); ctx.stroke();
  }
  for (let y = 0; y < mapData.height; y += gridSize) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(mapData.width, y); ctx.stroke();
  }
}

function drawObstacles() {
  mapData.obstacles.forEach(obs => {
    ctx.fillStyle = 'rgba(22, 28, 48, 0.95)';
    ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);
  });
}

function renderMinimap() {
  minimapCtx.fillStyle = 'rgba(7, 9, 14, 0.9)';
  minimapCtx.fillRect(0, 0, minimapCanvas.width, minimapCanvas.height);

  const sx = minimapCanvas.width / mapData.width;
  const sy = minimapCanvas.height / mapData.height;

  // Obstacles
  minimapCtx.fillStyle = 'rgba(0, 240, 255, 0.2)';
  mapData.obstacles.forEach(o => {
    minimapCtx.fillRect(o.x * sx, o.y * sy, o.w * sx, o.h * sy);
  });

  // Players
  latestSnapshot.players.forEach(p => {
    minimapCtx.fillStyle = p.color;
    minimapCtx.beginPath();
    minimapCtx.arc(p.x * sx, p.y * sy, p.id === myPlayerId ? 4 : 2.5, 0, Math.PI * 2);
    minimapCtx.fill();
  });

  // Zombies
  if (latestSnapshot.zombies) {
    minimapCtx.fillStyle = '#ff3366';
    latestSnapshot.zombies.forEach(z => {
      minimapCtx.fillRect(z.x * sx - 1, z.y * sy - 1, 2, 2);
    });
  }
}

// Start Render Loop
renderLoop();
