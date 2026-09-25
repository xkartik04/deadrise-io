// ==========================================
// DEADRISE.IO - 3D FIRST PERSON SHOOTER ENGINE
// ==========================================

const socket = io();

// Game State
let myPlayerId = null;
let currentRoomCode = null;
let isHost = false;
let myName = 'ApexHunter';
let myColor = '#00f0ff';
let latestSnapshot = null;
let soundEnabled = true;

// DOM Screens & Elements
const screens = {
  home: document.getElementById('screen-home'),
  lobby: document.getElementById('screen-lobby'),
  game: document.getElementById('screen-game')
};

const hud = {
  healthVal: document.getElementById('hud-health-val'),
  healthFill: document.getElementById('hud-health-fill'),
  armorVal: document.getElementById('hud-armor-val'),
  armorFill: document.getElementById('hud-armor-fill'),
  cashDisplay: document.getElementById('hud-cash-display'),
  zombiesCount: document.getElementById('hud-zombies-count'),
  weaponName: document.getElementById('hud-weapon-name'),
  ammoClip: document.getElementById('hud-ammo-clip'),
  ammoReserve: document.getElementById('hud-ammo-reserve'),
  reloadPrompt: document.getElementById('hud-reload-prompt'),
  killFeed: document.getElementById('kill-feed-container'),
  waveBanner: document.getElementById('wave-banner'),
  waveBannerTitle: document.getElementById('wave-banner-title'),
  waveBannerSub: document.getElementById('wave-banner-subtitle'),
  hitmarker: document.getElementById('hitmarker'),
  pointerLockOverlay: document.getElementById('pointer-lock-overlay'),
  storeModal: document.getElementById('store-modal')
};

const radarCanvas = document.getElementById('radar-canvas');
const radarCtx = radarCanvas.getContext('2d');

// --- 🔊 PROCEDURAL AUDIO SYNTHESIZER ---
class AudioEngine {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
  }

  playRifleShot() {
    if (!soundEnabled) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(480, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(70, this.ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playHitSound(isHeadshot = false) {
    if (!soundEnabled) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(isHeadshot ? 1600 : 900, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.06);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.06);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.06);
  }

  playZombieGroan() {
    if (!soundEnabled) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(60, this.ctx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
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
      osc.frequency.setValueAtTime(f, this.ctx.currentTime + i * 0.15);
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + i * 0.15 + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(this.ctx.currentTime + i * 0.15);
      osc.stop(this.ctx.currentTime + i * 0.15 + 0.12);
    });
  }
}

const audio = new AudioEngine();

// --- 🌐 THREE.JS 3D SCENE SETUP ---
const container = document.getElementById('webgl-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x060810);
scene.fog = new THREE.FogExp2(0x060810, 0.018);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 500);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
container.appendChild(renderer.domElement);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// 3D Lighting
const ambientLight = new THREE.AmbientLight(0x1a2238, 1.2);
scene.add(ambientLight);

const moonLight = new THREE.DirectionalLight(0x6088cc, 1.5);
moonLight.position.set(50, 100, 50);
scene.add(moonLight);

// Environment Construction
function build3DEnvironment() {
  // Ground Terrain (Asphalt)
  const groundGeo = new THREE.PlaneGeometry(300, 300);
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x111622, roughness: 0.85 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // Road grid lines
  const gridHelper = new THREE.GridHelper(300, 60, 0x00f0ff, 0x1e2840);
  gridHelper.position.y = 0.05;
  scene.add(gridHelper);

  // Buildings & Bunkers
  const buildingMat = new THREE.MeshStandardMaterial({ color: 0x161d2e, roughness: 0.7 });
  const bunkerMat = new THREE.MeshStandardMaterial({ color: 0x0f1420, roughness: 0.9 });

  const buildingCoords = [
    { x: -50, z: -50, w: 30, h: 20, d: 30 },
    { x: 50, z: -50, w: 30, h: 25, d: 30 },
    { x: -50, z: 50, w: 30, h: 18, d: 30 },
    { x: 50, z: 50, w: 30, h: 22, d: 30 },
    // Center Bunker
    { x: 0, z: 0, w: 25, h: 8, d: 25, isBunker: true }
  ];

  buildingCoords.forEach(b => {
    const geo = new THREE.BoxGeometry(b.w, b.h, b.d);
    const mesh = new THREE.Mesh(geo, b.isBunker ? bunkerMat : buildingMat);
    mesh.position.set(b.x, b.h / 2, b.z);
    scene.add(mesh);
  });

  // Guard Towers (matching image 4!)
  createGuardTower(-25, -25);
  createGuardTower(25, 25);

  // Street Lamps & Burning Barrels
  createStreetLamp(-15, -15);
  createStreetLamp(15, -15);
  createStreetLamp(-15, 15);
  createStreetLamp(15, 15);
  createBurningBarrel(0, 18);
  createBurningBarrel(0, -18);
}

function createGuardTower(x, z) {
  const towerGroup = new THREE.Group();
  const legMat = new THREE.MeshStandardMaterial({ color: 0x334155 });
  for (let i = 0; i < 4; i++) {
    const legGeo = new THREE.CylinderGeometry(0.3, 0.3, 16);
    const leg = new THREE.Mesh(legGeo, legMat);
    leg.position.set((i % 2 ? 4 : -4), 8, (i > 1 ? 4 : -4));
    towerGroup.add(leg);
  }
  const platGeo = new THREE.BoxGeometry(10, 1, 10);
  const plat = new THREE.Mesh(platGeo, legMat);
  plat.position.y = 16;
  towerGroup.add(plat);
  towerGroup.position.set(x, 0, z);
  scene.add(towerGroup);
}

function createStreetLamp(x, z) {
  const lampGroup = new THREE.Group();
  const poleGeo = new THREE.CylinderGeometry(0.2, 0.2, 10);
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x475569 });
  const pole = new THREE.Mesh(poleGeo, poleMat);
  pole.position.y = 5;
  lampGroup.add(pole);

  const light = new THREE.PointLight(0xffb703, 1.5, 30);
  light.position.set(0, 10, 0);
  lampGroup.add(light);
  lampGroup.position.set(x, 0, z);
  scene.add(lampGroup);
}

function createBurningBarrel(x, z) {
  const barrelGeo = new THREE.CylinderGeometry(1.2, 1.2, 3);
  const barrelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b });
  const barrel = new THREE.Mesh(barrelGeo, barrelMat);
  barrel.position.set(x, 1.5, z);
  scene.add(barrel);

  const fireLight = new THREE.PointLight(0xff4500, 2.5, 25);
  fireLight.position.set(x, 3.2, z);
  scene.add(fireLight);
}

build3DEnvironment();

// --- 🔫 3D FIRST-PERSON WEAPON & HANDS RIG ---
const fpsRig = new THREE.Group();
scene.add(fpsRig);

let gunMesh, muzzleFlashLight, bulletCasings = [], bloodParticles = [];

function buildFPSWeaponRig() {
  const gunGroup = new THREE.Group();

  // Weapon Receiver (SCAR-H Tan/Gold receiver matching screenshots!)
  const bodyGeo = new THREE.BoxGeometry(0.12, 0.16, 0.85);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xcca050, roughness: 0.4, metalness: 0.6 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  gunGroup.add(body);

  // Black Tactical Rails & Stock
  const railMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.18, 0.35), railMat);
  stock.position.set(0, -0.05, 0.55);
  gunGroup.add(stock);

  // Barrel & Flash Hider
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6), railMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.04, -0.65);
  gunGroup.add(barrel);

  // Iron Sights (matching screenshot 1 & 5!)
  const sightGeo = new THREE.BoxGeometry(0.04, 0.08, 0.04);
  const frontSight = new THREE.Mesh(sightGeo, railMat);
  frontSight.position.set(0, 0.13, -0.7);
  gunGroup.add(frontSight);
  const rearSight = new THREE.Mesh(sightGeo, railMat);
  rearSight.position.set(0, 0.13, 0.2);
  gunGroup.add(rearSight);

  // Magazine
  const magGeo = new THREE.BoxGeometry(0.08, 0.35, 0.16);
  const mag = new THREE.Mesh(magGeo, railMat);
  mag.position.set(0, -0.22, 0.05);
  mag.rotation.x = -0.15;
  gunGroup.add(mag);

  // Player Hands / Arms (matching screenshot arm view!)
  const armMat = new THREE.MeshStandardMaterial({ color: 0xe0a980, roughness: 0.9 });
  const gloveMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 });

  const rightHand = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.3), gloveMat);
  rightHand.position.set(0.08, -0.12, 0.25);
  gunGroup.add(rightHand);

  const leftHand = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.25), gloveMat);
  leftHand.position.set(-0.08, -0.05, -0.25);
  gunGroup.add(leftHand);

  // Muzzle Flash Light
  muzzleFlashLight = new THREE.PointLight(0xffea00, 0, 15);
  muzzleFlashLight.position.set(0, 0.04, -0.95);
  gunGroup.add(muzzleFlashLight);

  // Position relative to camera view
  gunGroup.position.set(0.24, -0.26, -0.55);
  gunMesh = gunGroup;
  camera.add(gunMesh);
  scene.add(camera);
}
buildFPSWeaponRig();

// --- 🧟 3D ZOMBIE MESH GENERATOR (Low-poly Glowing Eyes) ---
const zombieMeshes = new Map(); // id -> THREE.Group

function createZombie3DMesh(isBoss = false) {
  const group = new THREE.Group();
  const scale = isBoss ? 2.2 : 1.0;

  // Suit / Shirt (Grey / Office suit matching screenshot 1, 2, 3!)
  const suitMat = new THREE.MeshStandardMaterial({ color: isBoss ? 0x880000 : 0x475569, roughness: 0.8 });
  const fleshMat = new THREE.MeshStandardMaterial({ color: 0x85929e, roughness: 0.9 });
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0033 }); // Glowing red eyes!

  // Torso
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.9 * scale, 1.2 * scale, 0.5 * scale), suitMat);
  torso.position.y = 1.4 * scale;
  group.add(torso);

  // Head
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.6 * scale, 0.6 * scale, 0.6 * scale), fleshMat);
  head.position.set(0, 2.3 * scale, 0);
  group.add(head);

  // Glowing Red Eyes
  const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.08 * scale, 8, 8), eyeMat);
  leftEye.position.set(-0.16 * scale, 2.35 * scale, 0.31 * scale);
  group.add(leftEye);

  const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.08 * scale, 8, 8), eyeMat);
  rightEye.position.set(0.16 * scale, 2.35 * scale, 0.31 * scale);
  group.add(rightEye);

  // Zombie Arms (Reaching out forward matching screenshots!)
  const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.25 * scale, 0.25 * scale, 0.9 * scale), fleshMat);
  leftArm.position.set(-0.6 * scale, 1.7 * scale, 0.45 * scale);
  group.add(leftArm);

  const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.25 * scale, 0.25 * scale, 0.9 * scale), fleshMat);
  rightArm.position.set(0.6 * scale, 1.7 * scale, 0.45 * scale);
  group.add(rightArm);

  // Legs
  const legMat = new THREE.MeshStandardMaterial({ color: 0x1e293b });
  const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.3 * scale, 1.0 * scale, 0.3 * scale), legMat);
  leftLeg.position.set(-0.25 * scale, 0.5 * scale, 0);
  group.add(leftLeg);

  const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.3 * scale, 1.0 * scale, 0.3 * scale), legMat);
  rightLeg.position.set(0.25 * scale, 0.5 * scale, 0);
  group.add(rightLeg);

  return group;
}

// --- 🎮 POINTER LOCK & CONTROLS ---
let isPointerLocked = false;
const inputs = { forward: false, backward: false, left: false, right: false, sprint: false, yaw: 0, pitch: 0 };
let recoilOffset = { x: 0, y: 0, z: 0 };

document.addEventListener('click', (e) => {
  if (screens.game.classList.contains('active') && !isPointerLocked && hud.storeModal.classList.contains('hidden')) {
    container.requestPointerLock();
  }
});

document.addEventListener('pointerlockchange', () => {
  isPointerLocked = (document.pointerLockElement === container);
  if (isPointerLocked) {
    hud.pointerLockOverlay.classList.add('hidden');
  } else if (screens.game.classList.contains('active') && hud.storeModal.classList.contains('hidden')) {
    hud.pointerLockOverlay.classList.remove('hidden');
  }
});

document.addEventListener('mousemove', (e) => {
  if (!isPointerLocked) return;
  const sensitivity = 0.0022;
  inputs.yaw -= e.movementX * sensitivity;
  inputs.pitch = Math.max(-Math.PI / 2.3, Math.min(Math.PI / 2.3, inputs.pitch - e.movementY * sensitivity));
  camera.rotation.order = 'YXZ';
  camera.rotation.y = inputs.yaw;
  camera.rotation.x = inputs.pitch;
  socket.emit('player_input', inputs);
});

// Shooting
let isMouseDown = false;
window.addEventListener('mousedown', (e) => {
  if (e.button === 0 && isPointerLocked) {
    isMouseDown = true;
    fireBullet();
  }
});
window.addEventListener('mouseup', () => { isMouseDown = false; });

const keyMap = {
  KeyW: 'forward', ArrowUp: 'forward',
  KeyS: 'backward', ArrowDown: 'backward',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  ShiftLeft: 'sprint', ShiftRight: 'sprint'
};

window.addEventListener('keydown', (e) => {
  if (keyMap[e.code]) {
    inputs[keyMap[e.code]] = true;
    socket.emit('player_input', inputs);
  }
  if (e.code === 'KeyR') {
    socket.emit('player_reload');
    audio.playReload();
  }
  if (e.code === 'KeyF') {
    toggleStore();
  }
});

window.addEventListener('keyup', (e) => {
  if (keyMap[e.code]) {
    inputs[keyMap[e.code]] = false;
    socket.emit('player_input', inputs);
  }
});

function fireBullet() {
  if (!latestSnapshot) return;
  const me = latestSnapshot.players.find(p => p.id === myPlayerId);
  if (!me || me.ammo <= 0 || me.isReloading) return;

  // Visual Gun Recoil Kick
  recoilOffset.z = 0.09;
  recoilOffset.y = 0.03;
  muzzleFlashLight.intensity = 4.0;
  setTimeout(() => { muzzleFlashLight.intensity = 0; }, 40);

  // Eject Yellow Bullet Shell Casing (matching screenshot 5!)
  spawnBulletCasing();

  // Play Sound
  audio.playRifleShot();

  // Raycasting Target Detection (Headshot vs Body)
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

  let targetHit = null;
  let isHead = false;

  latestSnapshot.zombies.forEach(z => {
    const zmMesh = zombieMeshes.get(z.id);
    if (zmMesh && z.health > 0) {
      const dist = camera.position.distanceTo(zmMesh.position);
      if (dist < 80) {
        // Calculate hit alignment
        const toZombie = new THREE.Vector3().subVectors(zmMesh.position, camera.position).normalize();
        const dir = raycaster.ray.direction;
        const dot = dir.dot(toZombie);

        if (dot > 0.96) {
          targetHit = z.id;
          isHead = (Math.abs(dir.y) < 0.2 && Math.random() > 0.4); // Headshot chance on precision
        }
      }
    }
  });

  socket.emit('player_shoot_target', { targetZombieId: targetHit, isHeadshot: isHead });
}

// Spawns physical yellow shell casing flying out of ejection port
function spawnBulletCasing() {
  const casingGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.06);
  const casingMat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
  const casing = new THREE.Mesh(casingGeo, casingMat);

  const worldPos = new THREE.Vector3();
  gunMesh.getWorldPosition(worldPos);
  casing.position.copy(worldPos);

  const velocity = new THREE.Vector3(
    Math.cos(camera.rotation.y) * 0.15 + (Math.random() - 0.5) * 0.05,
    0.1 + Math.random() * 0.08,
    -Math.sin(camera.rotation.y) * 0.15
  );

  scene.add(casing);
  bulletCasings.push({ mesh: casing, vel: velocity, life: 60 });
}

// --- 📱 SHARING URL UTILITY ---
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

document.getElementById('copy-share-link-btn').addEventListener('click', copyShareLinkToClipboard);
hud.shareBtn.addEventListener('click', copyShareLinkToClipboard);

// --- MENU & LOBBY HANDLERS ---
document.getElementById('quick-play-btn').addEventListener('click', () => {
  myName = document.getElementById('player-name-input').value.trim() || 'ApexHunter';
  audio.init();
  socket.emit('create_room', { playerName: myName, playerColor: myColor });
});

document.getElementById('join-room-btn').addEventListener('click', () => {
  const code = document.getElementById('join-room-input').value.trim().toUpperCase();
  myName = document.getElementById('player-name-input').value.trim() || `Soldier_${Math.floor(Math.random() * 900 + 100)}`;
  if (!code) {
    alert('Please enter a 4-letter Room Code!');
    return;
  }
  audio.init();
  socket.emit('join_room', { roomCode: code, playerName: myName, playerColor: myColor });
});

document.getElementById('add-bot-btn').addEventListener('click', () => {
  socket.emit('add_bot');
});

document.getElementById('start-battle-btn').addEventListener('click', () => {
  socket.emit('start_game');
});

// Color picker
document.querySelectorAll('.color-dot').forEach(dot => {
  dot.addEventListener('click', () => {
    document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('selected'));
    dot.classList.add('selected');
    myColor = dot.dataset.color;
  });
});

// Auto-Join on URL ?room=CODE
window.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const room = urlParams.get('room');
  if (room) {
    const input = document.getElementById('join-room-input');
    if (input) input.value = room.toUpperCase();
    setTimeout(() => document.getElementById('join-room-btn').click(), 400);
  }
});

// Store Modal Handlers
function toggleStore() {
  if (hud.storeModal.classList.contains('hidden')) {
    hud.storeModal.classList.remove('hidden');
    document.exitPointerLock();
  } else {
    hud.storeModal.classList.add('hidden');
    container.requestPointerLock();
  }
}
document.getElementById('open-store-btn').addEventListener('click', toggleStore);
document.getElementById('close-store-btn').addEventListener('click', toggleStore);

document.querySelectorAll('.buy-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    socket.emit('buy_weapon', { weaponKey: btn.dataset.item });
  });
});
document.querySelector('.buy-ammo-btn').addEventListener('click', () => socket.emit('buy_ammo'));
document.querySelector('.buy-armor-btn').addEventListener('click', () => socket.emit('buy_armor'));

// --- SOCKET EVENTS ---
socket.on('room_created', ({ roomCode, player }) => {
  currentRoomCode = roomCode;
  myPlayerId = player.id;
  isHost = true;
  setupLobby(roomCode, [player], true);
});

socket.on('room_joined', ({ roomCode, player }) => {
  currentRoomCode = roomCode;
  myPlayerId = player.id;
  isHost = player.isHost;
  setupLobby(roomCode, [player], isHost);
});

socket.on('lobby_update', ({ players }) => {
  updateRoster(players);
});

socket.on('join_error', ({ message }) => alert(message));

socket.on('game_started', () => {
  showScreen('game');
  hud.pointerLockOverlay.classList.remove('hidden');
});

socket.on('fps_tick', (snapshot) => {
  latestSnapshot = snapshot;

  // Process server events
  if (snapshot.events) {
    snapshot.events.forEach(ev => {
      if (ev.type === 'zombie_hit') {
        if (ev.isHeadshot) audio.playHitSound(true);
        else audio.playHitSound(false);
        showHitmarker();
        spawnBloodSparks(ev.x, ev.y, ev.z);
      } else if (ev.type === 'zombie_killed') {
        addKillPill(`💀 ${ev.killerName} eliminated mutant!`);
      } else if (ev.type === 'wave_cleared') {
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

  // QR Code
  renderQRCode('qr-canvas', getShareUrl(code));
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
    item.innerHTML = `<span>${p.name}</span><span style="color:#94a3b8; font-size:0.75rem;">${p.isBot ? '🤖 AI BOT' : (p.isHost ? '👑 HOST' : 'SOLDIER')}</span>`;
    list.appendChild(item);
  });
}

function showHitmarker() {
  hud.hitmarker.classList.remove('hidden');
  setTimeout(() => hud.hitmarker.classList.add('hidden'), 150);
}

function addKillPill(txt) {
  const p = document.createElement('div');
  p.className = 'kill-pill';
  p.textContent = txt;
  hud.killFeed.appendChild(p);
  setTimeout(() => p.remove(), 3500);
}

function triggerWaveBanner(wave) {
  hud.waveBannerTitle.textContent = `WAVE ${wave}`;
  hud.waveBannerSub.textContent = 'MUTANTS INCOMING!';
  hud.waveBanner.classList.remove('hidden');
  setTimeout(() => hud.waveBanner.classList.add('hidden'), 2500);
}

function showScreen(name) {
  Object.keys(screens).forEach(k => screens[k].classList.remove('active'));
  if (screens[name]) screens[name].classList.add('active');
}

function spawnBloodSparks(x, y, z) {
  for (let i = 0; i < 8; i++) {
    const geo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
    const mat = new THREE.MeshBasicMaterial({ color: 0x990000 });
    const part = new THREE.Mesh(geo, mat);
    part.position.set(x, y, z);
    scene.add(part);
    bloodParticles.push({
      mesh: part,
      vel: new THREE.Vector3((Math.random() - 0.5) * 0.2, Math.random() * 0.2, (Math.random() - 0.5) * 0.2),
      life: 25
    });
  }
}

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

// --- 🎮 MAIN 3D 60 FPS RENDER LOOP ---
function animate() {
  requestAnimationFrame(animate);

  if (screens.game.classList.contains('active') && latestSnapshot) {
    const me = latestSnapshot.players.find(p => p.id === myPlayerId);

    // Update Player Position & Camera in 3D
    if (me) {
      camera.position.set(me.x, me.y, me.z);

      // Smooth Weapon Recoil recovery
      recoilOffset.z *= 0.85;
      recoilOffset.y *= 0.85;
      gunMesh.position.set(0.24, -0.26 + recoilOffset.y, -0.55 + recoilOffset.z);

      // Update HUD Elements
      hud.healthVal.textContent = me.health;
      hud.healthFill.style.width = `${me.health}%`;
      hud.armorVal.textContent = me.armor;
      hud.armorFill.style.width = `${(me.armor / 50) * 100}%`;
      hud.cashDisplay.textContent = `$${me.cash.toLocaleString()}`;
      hud.zombiesCount.textContent = latestSnapshot.zombiesCount;

      hud.weaponName.textContent = me.weapon.toUpperCase();
      hud.ammoClip.textContent = me.ammo;
      hud.ammoReserve.textContent = me.reserveAmmo;

      if (me.isReloading) hud.reloadPrompt.classList.remove('hidden');
      else hud.reloadPrompt.classList.add('hidden');

      // Update Wave Dot indicator
      document.querySelectorAll('.w-dot').forEach(dot => {
        const w = Number(dot.dataset.w);
        if (w === latestSnapshot.wave) dot.classList.add('active');
        else dot.classList.remove('active');
      });
    }

    // Synchronize 3D Zombie Models
    const activeZombieIds = new Set();
    latestSnapshot.zombies.forEach(z => {
      activeZombieIds.add(z.id);
      let mesh = zombieMeshes.get(z.id);
      if (!mesh) {
        mesh = createZombie3DMesh(z.isBoss);
        scene.add(mesh);
        zombieMeshes.set(z.id, mesh);
      }
      mesh.position.set(z.x, z.y, z.z);
      mesh.rotation.y = z.yaw;
    });

    // Remove dead zombies from 3D scene
    zombieMeshes.forEach((mesh, id) => {
      if (!activeZombieIds.has(id)) {
        scene.remove(mesh);
        zombieMeshes.delete(id);
      }
    });

    // Animate Ejected Bullet Shell Casings
    bulletCasings = bulletCasings.filter(c => {
      c.mesh.position.add(c.vel);
      c.vel.y -= 0.008; // Gravity
      c.mesh.rotation.x += 0.2;
      c.life--;
      if (c.life <= 0) {
        scene.remove(c.mesh);
        return false;
      }
      return true;
    });

    // Animate Blood Particles
    bloodParticles = bloodParticles.filter(bp => {
      bp.mesh.position.add(bp.vel);
      bp.vel.y -= 0.01;
      bp.life--;
      if (bp.life <= 0) {
        scene.remove(bp.mesh);
        return false;
      }
      return true;
    });

    // Render 2D Minimap Radar
    renderRadar();
  }

  renderer.render(scene, camera);
}

function renderRadar() {
  radarCtx.fillStyle = 'rgba(6, 8, 16, 0.85)';
  radarCtx.fillRect(0, 0, radarCanvas.width, radarCanvas.height);

  const cx = radarCanvas.width / 2;
  const cy = radarCanvas.height / 2;
  const scale = 1.2;

  // Radar Rings
  radarCtx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
  radarCtx.beginPath(); radarCtx.arc(cx, cy, 30, 0, Math.PI * 2); radarCtx.stroke();
  radarCtx.beginPath(); radarCtx.arc(cx, cy, 55, 0, Math.PI * 2); radarCtx.stroke();

  // Player center dot (Cyan)
  radarCtx.fillStyle = '#00f0ff';
  radarCtx.beginPath(); radarCtx.arc(cx, cy, 3.5, 0, Math.PI * 2); radarCtx.fill();

  if (latestSnapshot) {
    const me = latestSnapshot.players.find(p => p.id === myPlayerId) || { x: 0, z: 0 };
    // Draw Zombies as Red dots
    latestSnapshot.zombies.forEach(z => {
      const relX = (z.x - me.x) * scale;
      const relZ = (z.z - me.z) * scale;
      if (Math.hypot(relX, relZ) < 60) {
        radarCtx.fillStyle = z.isBoss ? '#ff0033' : '#ff3366';
        radarCtx.beginPath();
        radarCtx.arc(cx + relX, cy + relZ, z.isBoss ? 4 : 2.5, 0, Math.PI * 2);
        radarCtx.fill();
      }
    });
  }
}

// Launch 3D loop
animate();
