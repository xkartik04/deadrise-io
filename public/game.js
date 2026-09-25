// ==========================================
// JUGAAD HEIST - CLIENT GAME ENGINE
// ==========================================

const socket = io();

// State Variables
let currentRoomCode = null;
let myPlayerId = null;
let isHost = false;
let myPlayerName = '';
let myAvatar = '🧑‍🚀';
let myRoleInfo = null;
let soundEnabled = true;

// DOM Elements
const screens = {
  home: document.getElementById('screen-home'),
  lobby: document.getElementById('screen-lobby'),
  blueprint: document.getElementById('screen-blueprint'),
  pitch: document.getElementById('screen-pitch'),
  showcase: document.getElementById('screen-showcase'),
  voting: document.getElementById('screen-voting'),
  auction: document.getElementById('screen-auction'),
  reveal: document.getElementById('screen-reveal'),
  gameover: document.getElementById('screen-gameover')
};

const topBar = {
  container: document.getElementById('top-bar'),
  statusBadge: document.getElementById('game-status-badge'),
  roomTag: document.getElementById('room-code-tag'),
  cashTag: document.getElementById('player-cash-tag'),
  soundBtn: document.getElementById('sound-btn')
};

const reactionBar = document.getElementById('bottom-reaction-bar');
const reactionContainer = document.getElementById('floating-reaction-container');

// --- 🔊 PROCEDURAL SOUND SYNTHESIZER (Web Audio API) ---
class SoundSynth {
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

  playPop() {
    if (!soundEnabled) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playGavel() {
    if (!soundEnabled) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.25);
    gain.gain.setValueAtTime(0.7, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.25);
  }

  playCoins() {
    if (!soundEnabled) return;
    this.init();
    if (!this.ctx) return;
    const freqs = [987.77, 1318.51, 1975.53];
    freqs.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.06);
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + idx * 0.06 + 0.15);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(this.ctx.currentTime + idx * 0.06);
      osc.stop(this.ctx.currentTime + idx * 0.06 + 0.15);
    });
  }

  playTick() {
    if (!soundEnabled) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.04);
  }

  playGlitch() {
    if (!soundEnabled) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(80, this.ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  playFanfare() {
    if (!soundEnabled) return;
    this.init();
    if (!this.ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((note, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note, this.ctx.currentTime + idx * 0.12);
      gain.gain.setValueAtTime(0.3, this.ctx.currentTime + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + idx * 0.12 + 0.4);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(this.ctx.currentTime + idx * 0.12);
      osc.stop(this.ctx.currentTime + idx * 0.12 + 0.4);
    });
  }
}

const sound = new SoundSynth();

// --- 📱 LIGHTWEIGHT QR CODE RENDERER ---
// Generates clean pixel QR code on HTML5 Canvas
function renderQRCode(canvasId, text) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const size = 160;
  canvas.width = size;
  canvas.height = size;

  // Render high-res stylish QR representation
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  // Generate deterministic grid pattern based on text hash
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }

  const gridSize = 21;
  const cellSize = Math.floor((size - 20) / gridSize);
  const offset = Math.floor((size - (cellSize * gridSize)) / 2);

  ctx.fillStyle = '#070913';

  // Draw standard QR finder patterns in corners
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

  // Data modules
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
function showScreen(screenKey) {
  Object.keys(screens).forEach(key => {
    if (screens[key]) {
      screens[key].classList.remove('active');
    }
  });
  if (screens[screenKey]) {
    screens[screenKey].classList.add('active');
  }

  // Show reaction bar on active gameplay screens
  const isGameplay = ['blueprint', 'pitch', 'showcase', 'voting', 'auction', 'reveal'].includes(screenKey);
  if (isGameplay) {
    reactionBar.classList.remove('hidden');
    topBar.statusBadge.classList.remove('hidden');
  } else if (screenKey === 'lobby') {
    reactionBar.classList.add('hidden');
    topBar.statusBadge.classList.remove('hidden');
  } else {
    reactionBar.classList.add('hidden');
    topBar.statusBadge.classList.add('hidden');
  }
}

// --- AVATAR SELECTION ---
document.querySelectorAll('.avatar-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.avatar-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    myAvatar = btn.dataset.avatar;
    sound.playPop();
  });
});

// --- URL AUTO-JOIN DETECTION ---
window.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const roomParam = urlParams.get('room');
  if (roomParam) {
    const joinInput = document.getElementById('join-room-input');
    if (joinInput) {
      joinInput.value = roomParam.toUpperCase();
    }
  }
});

// --- AUDIO TOGGLE ---
topBar.soundBtn.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  topBar.soundBtn.textContent = soundEnabled ? '🔊' : '🔇';
});

// --- CREATE ROOM (HOST) ---
document.getElementById('create-game-btn').addEventListener('click', () => {
  const nameInput = document.getElementById('player-name-input').value.trim() || 'Host';
  myPlayerName = nameInput;
  sound.playPop();
  socket.emit('create_room', { hostName: myPlayerName, avatar: myAvatar });
});

// --- JOIN ROOM (PLAYER) ---
document.getElementById('join-game-btn').addEventListener('click', () => {
  const codeInput = document.getElementById('join-room-input').value.trim().toUpperCase();
  const nameInput = document.getElementById('player-name-input').value.trim() || `Player_${Math.floor(Math.random() * 900 + 100)}`;
  if (!codeInput) {
    alert('Please enter a 4-letter Room Code!');
    return;
  }
  myPlayerName = nameInput;
  sound.playPop();
  socket.emit('join_room', { roomCode: codeInput, playerName: myPlayerName, avatar: myAvatar });
});

// --- COPY ROOM LINK ---
document.getElementById('copy-link-btn').addEventListener('click', () => {
  if (!currentRoomCode) return;
  const joinUrl = `${window.location.origin}/?room=${currentRoomCode}`;
  navigator.clipboard.writeText(joinUrl).then(() => {
    sound.playPop();
    const btn = document.getElementById('copy-link-btn');
    btn.textContent = '✅ Copied!';
    setTimeout(() => { btn.textContent = '📋 Copy Link'; }, 2000);
  }).catch(() => {
    alert(`Join URL: ${joinUrl}`);
  });
});

// --- ADD AI BOT ---
document.getElementById('add-bot-btn').addEventListener('click', () => {
  sound.playPop();
  socket.emit('add_bot');
});

// --- START GAME ---
document.getElementById('start-game-btn').addEventListener('click', () => {
  sound.playPop();
  socket.emit('start_game');
});

// --- SUBMIT PITCH ---
document.getElementById('submit-pitch-btn').addEventListener('click', () => {
  const pitchText = document.getElementById('pitch-input').value.trim();
  if (!pitchText) {
    alert('Please type a pitch or slogan before submitting!');
    return;
  }
  sound.playPop();
  socket.emit('submit_pitch', { pitchText });
  document.getElementById('pitch-form-container').classList.add('hidden');
  document.getElementById('pitch-submitted-feedback').classList.remove('hidden');
});

// --- BIDDING CONTROLS ---
document.getElementById('bid-500-btn').addEventListener('click', () => {
  sound.playCoins();
  socket.emit('place_bid', { increment: 500 });
});

document.getElementById('bid-1000-btn').addEventListener('click', () => {
  sound.playCoins();
  socket.emit('place_bid', { increment: 1000 });
});

document.getElementById('pass-bid-btn').addEventListener('click', () => {
  sound.playPop();
  socket.emit('pass_bid');
  document.getElementById('bidding-controls').classList.add('hidden');
  document.getElementById('passed-feedback').classList.remove('hidden');
});

// --- PLAY AGAIN / RESTART ---
document.getElementById('play-again-btn').addEventListener('click', () => {
  sound.playPop();
  socket.emit('restart_game');
});

document.getElementById('leave-room-btn').addEventListener('click', () => {
  window.location.href = '/';
});

// --- LIVE FLOATING REACTIONS ---
document.querySelectorAll('.rx-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const emoji = btn.dataset.emoji;
    socket.emit('send_reaction', { emoji });
  });
});

// --- SOCKET.IO EVENT RESPONSES ---

// 1. Room Created
socket.on('room_created', ({ roomCode, player, state }) => {
  currentRoomCode = roomCode;
  myPlayerId = player.id;
  isHost = true;
  setupLobbyView(roomCode, state, true);
});

// 2. Room Joined
socket.on('room_joined', ({ roomCode, player, state }) => {
  currentRoomCode = roomCode;
  myPlayerId = player.id;
  isHost = player.isHost;
  setupLobbyView(roomCode, state, isHost);
});

// 3. Error
socket.on('join_error', ({ message }) => {
  alert(message);
});

socket.on('game_error', ({ message }) => {
  alert(message);
});

// Setup Lobby
function setupLobbyView(roomCode, state, amHost) {
  document.getElementById('lobby-room-code').textContent = roomCode;
  topBar.roomTag.textContent = `ROOM: ${roomCode}`;

  const hostControls = document.getElementById('host-controls');
  const guestMsg = document.getElementById('guest-waiting-msg');

  if (amHost) {
    hostControls.classList.remove('hidden');
    guestMsg.classList.add('hidden');
  } else {
    hostControls.classList.add('hidden');
    guestMsg.classList.remove('hidden');
  }

  // Render QR
  const joinUrl = `${window.location.origin}/?room=${roomCode}`;
  renderQRCode('qr-canvas', joinUrl);

  updateRoster(state.players);
  showScreen('lobby');
}

// Update Roster
function updateRoster(players) {
  const roster = document.getElementById('players-roster-list');
  const countSpan = document.getElementById('player-count');
  if (!roster) return;

  countSpan.textContent = players.length;
  roster.innerHTML = '';

  players.forEach(p => {
    const card = document.createElement('div');
    card.className = 'player-roster-item';
    card.innerHTML = `
      <div class="player-info-left">
        <span class="player-avatar-icon">${p.avatar}</span>
        <span class="player-name-text">${escapeHTML(p.name)}</span>
      </div>
      <div>
        ${p.isHost ? '<span class="player-host-tag">HOST</span>' : ''}
        ${p.isBot ? '<span class="player-host-tag" style="background:#00f0ff;">BOT</span>' : ''}
      </div>
    `;
    roster.appendChild(card);
  });
}

// 4. Secret Role Assigned
socket.on('secret_role_assigned', (roleData) => {
  myRoleInfo = roleData;
  const roleBanner = document.getElementById('role-banner');
  const blueprintBox = document.getElementById('blueprint-content-box');

  if (roleData.isImposter) {
    sound.playGlitch();
    roleBanner.className = 'role-banner imposter';
    roleBanner.innerHTML = `🚨 YOU ARE THE SECRET IMPOSTER (CHOR)!`;

    blueprintBox.innerHTML = `
      <h3 style="color:#ff3366;">⚠️ ENCRYPTED BLUEPRINT</h3>
      <p><strong>Category Hint:</strong> ${escapeHTML(roleData.titleHint)}</p>
      <p><strong>Your Mission:</strong> ${escapeHTML(roleData.prompt)}</p>
      <p style="color:#ffb703; font-size:0.9rem;">Bluff with confidence! Don't let others find out you don't know the real invention!</p>
    `;
  } else {
    sound.playPop();
    roleBanner.className = 'role-banner inventor';
    roleBanner.innerHTML = `💡 AUTHENTIC MASTER INVENTOR`;

    blueprintBox.innerHTML = `
      <h3 style="color:#00f59b;">${escapeHTML(roleData.title)}</h3>
      <p><strong>Category:</strong> ${escapeHTML(roleData.category)}</p>
      <p>${escapeHTML(roleData.description)}</p>
      <p><strong>Estimated Market Base:</strong> ₹${roleData.baseValue.toLocaleString()}</p>
    `;
  }
});

// 5. General Game State Update
socket.on('game_state_update', (state) => {
  // Update header cash & score
  const me = state.players.find(p => p.id === myPlayerId);
  if (me) {
    topBar.cashTag.textContent = `₹${me.cash.toLocaleString()}`;
  }

  // Handle Screen routing based on state.state
  switch (state.state) {
    case 'LOBBY':
      updateRoster(state.players);
      showScreen('lobby');
      break;

    case 'BLUEPRINT':
      document.getElementById('round-num-tag').textContent = state.roundNumber;
      showScreen('blueprint');
      break;

    case 'PITCH':
      document.getElementById('pitch-form-container').classList.remove('hidden');
      document.getElementById('pitch-submitted-feedback').classList.add('hidden');
      document.getElementById('pitch-input').value = '';

      if (state.currentInvention) {
        document.getElementById('pitch-invention-title').textContent = myRoleInfo && myRoleInfo.isImposter 
          ? `Category: ${state.currentInvention.category}` 
          : state.currentInvention.title;
      }
      showScreen('pitch');
      break;

    case 'SHOWCASE':
      renderShowcasePitches(state.pitches);
      showScreen('showcase');
      break;

    case 'VOTING':
      renderVotingCandidates(state.players);
      showScreen('voting');
      break;

    case 'AUCTION':
      setupAuctionScreen(state);
      showScreen('auction');
      break;

    case 'GAMEOVER':
      renderPodium(state.players);
      showScreen('gameover');
      break;
  }
});

// 6. Timer Tick
socket.on('timer_tick', ({ timeLeft }) => {
  sound.playTick();
  const timerElements = [
    document.getElementById('blueprint-timer'),
    document.getElementById('pitch-timer'),
    document.getElementById('showcase-timer'),
    document.getElementById('voting-timer'),
    document.getElementById('auction-timer'),
    document.getElementById('reveal-timer')
  ];
  timerElements.forEach(el => {
    if (el) el.textContent = timeLeft;
  });
});

// 7. Render Showcase Pitches
function renderShowcasePitches(pitches) {
  const container = document.getElementById('showcase-pitches-grid');
  if (!container) return;
  container.innerHTML = '';

  pitches.forEach(p => {
    const card = document.createElement('div');
    card.className = 'pitch-card';
    card.innerHTML = `
      <div class="pitch-card-author">
        <span>${p.playerAvatar}</span>
        <span>${escapeHTML(p.playerName)}</span>
      </div>
      <p class="pitch-card-quote">"${escapeHTML(p.pitchText)}"</p>
    `;
    container.appendChild(card);
  });
}

// 8. Render Voting Candidates
function renderVotingCandidates(players) {
  const container = document.getElementById('voting-candidates-grid');
  const feedback = document.getElementById('vote-submitted-feedback');
  if (!container) return;

  container.innerHTML = '';
  feedback.classList.add('hidden');

  players.forEach(p => {
    if (p.id !== myPlayerId) {
      const btn = document.createElement('button');
      btn.className = 'vote-candidate-btn';
      btn.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="font-size:1.5rem;">${p.avatar}</span>
          <span style="font-weight:700;">${escapeHTML(p.name)}</span>
        </div>
        <span style="font-size:0.85rem; color:#ff3366;">👉 ACCUSE</span>
      `;
      btn.addEventListener('click', () => {
        sound.playPop();
        socket.emit('submit_vote', { targetPlayerId: p.id });
        container.innerHTML = '';
        feedback.classList.remove('hidden');
      });
      container.appendChild(btn);
    }
  });
}

// 9. Setup Auction Screen
function setupAuctionScreen(state) {
  if (!state.currentInvention) return;
  document.getElementById('auction-item-title').textContent = state.currentInvention.title;
  document.getElementById('auction-item-category').textContent = state.currentInvention.category;
  document.getElementById('auction-current-bid').textContent = `₹${state.auction.currentBid.toLocaleString()}`;
  document.getElementById('auction-high-bidder').textContent = state.auction.highestBidderName;

  document.getElementById('bidding-controls').classList.remove('hidden');
  document.getElementById('passed-feedback').classList.add('hidden');
}

// 10. Bid Placed
socket.on('bid_placed', ({ playerName, playerAvatar, amount }) => {
  sound.playGavel();
  document.getElementById('auction-current-bid').textContent = `₹${amount.toLocaleString()}`;
  document.getElementById('auction-high-bidder').textContent = `${playerAvatar} ${playerName}`;
});

// 11. Round Reveal Data
socket.on('round_reveal_data', (results) => {
  showScreen('reveal');
  sound.playCoins();

  const container = document.getElementById('reveal-summary-box');
  const imposterNames = results.imposters.map(i => `${i.avatar} ${i.name}`).join(', ');

  container.innerHTML = `
    <div class="reveal-card" style="border-color:${results.imposterCaught ? '#00f59b' : '#ff3366'}">
      <h3>${results.imposterCaught ? '🎉 IMPOSTER BUSTED!' : '🕶️ THE IMPOSTER GOT AWAY!'}</h3>
      <p style="margin-top:8px;"><strong>Actual Imposter:</strong> ${escapeHTML(imposterNames)}</p>
      <p><strong>Real Invention:</strong> ${escapeHTML(results.invention.title)}</p>
    </div>

    <div class="reveal-card">
      <h3>🔨 AUCTION RESULT</h3>
      <p style="margin-top:8px;">
        ${results.auctionWinner 
          ? `<strong>Winner:</strong> ${results.auctionWinner.avatar} ${escapeHTML(results.auctionWinner.name)} for <strong>₹${results.winningBid.toLocaleString()}</strong>!`
          : 'No bids placed! Item returned to vault.'}
      </p>
    </div>
  `;
});

// 12. Floating Reaction Received
socket.on('floating_reaction', ({ emoji }) => {
  const el = document.createElement('div');
  el.className = 'floating-emoji';
  el.textContent = emoji;
  el.style.left = `${Math.floor(Math.random() * 80 + 10)}%`;
  reactionContainer.appendChild(el);

  setTimeout(() => {
    el.remove();
  }, 2500);
});

// 13. Render Podium & Confetti
function renderPodium(players) {
  sound.playFanfare();
  const sorted = [...players].sort((a, b) => b.score - a.score);

  const podium = document.getElementById('podium-display');
  const roster = document.getElementById('final-leaderboard-list');
  podium.innerHTML = '';
  roster.innerHTML = '';

  // Podium 2nd, 1st, 3rd slots
  const p1 = sorted[0];
  const p2 = sorted[1];
  const p3 = sorted[2];

  if (p2) {
    podium.innerHTML += `
      <div class="podium-slot rank-2">
        <span style="font-size:1.8rem;">${p2.avatar}</span>
        <span style="font-weight:700; font-size:0.9rem;">${escapeHTML(p2.name)}</span>
        <div class="podium-block">2</div>
      </div>
    `;
  }

  if (p1) {
    podium.innerHTML += `
      <div class="podium-slot rank-1">
        <span style="font-size:2.4rem;">${p1.avatar}</span>
        <span style="font-weight:900; color:var(--accent-gold);">${escapeHTML(p1.name)}</span>
        <div class="podium-block">1</div>
      </div>
    `;
  }

  if (p3) {
    podium.innerHTML += `
      <div class="podium-slot rank-3">
        <span style="font-size:1.6rem;">${p3.avatar}</span>
        <span style="font-weight:700; font-size:0.9rem;">${escapeHTML(p3.name)}</span>
        <div class="podium-block">3</div>
      </div>
    `;
  }

  sorted.forEach((p, idx) => {
    const item = document.createElement('div');
    item.className = 'player-roster-item';
    item.innerHTML = `
      <div class="player-info-left">
        <span style="font-weight:900; color:var(--accent-gold); width:24px;">#${idx + 1}</span>
        <span class="player-avatar-icon">${p.avatar}</span>
        <span class="player-name-text">${escapeHTML(p.name)}</span>
      </div>
      <div style="font-family:'Space Grotesk',monospace; font-weight:800; color:var(--accent-green);">
        ${p.score} PTS | ₹${p.cash.toLocaleString()}
      </div>
    `;
    roster.appendChild(item);
  });

  launchConfetti();
}

// Lightweight Canvas Confetti Particles
function launchConfetti() {
  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '9999';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = [];
  const colors = ['#ffb703', '#00f0ff', '#ff007f', '#00f59b', '#ffffff'];

  for (let i = 0; i < 120; i++) {
    particles.push({
      x: canvas.width / 2,
      y: canvas.height / 2,
      vx: (Math.random() - 0.5) * 16,
      vy: (Math.random() - 0.7) * 16,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      rSpeed: (Math.random() - 0.5) * 10
    });
  }

  let frame = 0;
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.35; // gravity
      p.rotation += p.rSpeed;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
    });

    frame++;
    if (frame < 180) {
      requestAnimationFrame(animate);
    } else {
      canvas.remove();
    }
  }
  animate();
}

// Utility: Escape HTML
function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
