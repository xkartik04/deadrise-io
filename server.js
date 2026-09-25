const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;

// Arena Size
const MAP_WIDTH = 2600;
const MAP_HEIGHT = 1800;

// Map Obstacles / Walls / Buildings
const OBSTACLES = [
  // Outer Boundaries
  { x: 0, y: 0, w: MAP_WIDTH, h: 40 },
  { x: 0, y: MAP_HEIGHT - 40, w: MAP_WIDTH, h: 40 },
  { x: 0, y: 0, w: 40, h: MAP_HEIGHT },
  { x: MAP_WIDTH - 40, y: 0, w: 40, h: MAP_HEIGHT },

  // Center Compound
  { x: 1000, y: 650, w: 600, h: 500, type: 'bunker' },

  // Corner Bunkers / Warehouses
  { x: 250, y: 250, w: 350, h: 250, type: 'warehouse' },
  { x: 2000, y: 250, w: 350, h: 250, type: 'warehouse' },
  { x: 250, y: 1300, w: 350, h: 250, type: 'warehouse' },
  { x: 2000, y: 1300, w: 350, h: 250, type: 'warehouse' },

  // Tactical Barricades & Crates
  { x: 800, y: 350, w: 120, h: 40 },
  { x: 1680, y: 350, w: 120, h: 40 },
  { x: 800, y: 1400, w: 120, h: 40 },
  { x: 1680, y: 1400, w: 120, h: 40 },
  { x: 500, y: 800, w: 40, h: 200 },
  { x: 2060, y: 800, w: 40, h: 200 }
];

// Weapon Definitions
const WEAPONS = {
  assault: { name: 'Assault Rifle', damage: 24, fireRate: 110, spread: 0.05, magSize: 30, reloadTime: 1600, speed: 28, bulletCount: 1, color: '#00f0ff' },
  shotgun: { name: 'Combat Shotgun', damage: 18, fireRate: 650, spread: 0.22, magSize: 8, reloadTime: 2200, speed: 24, bulletCount: 6, color: '#ffb703' },
  sniper: { name: 'Heavy Sniper', damage: 95, fireRate: 1100, spread: 0.01, magSize: 5, reloadTime: 2500, speed: 45, bulletCount: 1, color: '#ff007f' },
  plasma: { name: 'Plasma Launcher', damage: 70, fireRate: 700, spread: 0.04, magSize: 6, reloadTime: 2000, speed: 18, bulletCount: 1, isExplosive: true, color: '#00f59b' }
};

const rooms = new Map();

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return rooms.has(code) ? generateRoomCode() : code;
}

// Player Class
class Survivor {
  constructor(id, name, color, isHost = false, isBot = false) {
    this.id = id;
    this.name = name;
    this.color = color || '#00f0ff';
    this.isHost = isHost;
    this.isBot = isBot;

    // Position & Movement
    this.x = 400 + Math.random() * (MAP_WIDTH - 800);
    this.y = 400 + Math.random() * (MAP_HEIGHT - 800);
    this.angle = 0; // Aiming angle (radians)
    this.vx = 0;
    this.vy = 0;
    this.baseSpeed = 6;
    this.radius = 20;

    // Combat Stats
    this.maxHealth = 100;
    this.health = 100;
    this.maxArmor = 50;
    this.armor = 50;
    this.stamina = 100; // For Sprint/Slide
    this.isSprinting = false;
    this.isReloading = false;
    this.reloadEnd = 0;

    // Weapon Inventory
    this.weapon = 'assault';
    this.ammo = WEAPONS.assault.magSize;
    this.lastShotTime = 0;
    this.kills = 0;
    this.score = 0;
    this.deaths = 0;

    // Inputs
    this.inputs = {
      up: false, down: false, left: false, right: false,
      shoot: false, sprint: false, reload: false,
      aimX: 0, aimY: 0
    };

    // Bot AI
    this.botTarget = null;
    this.botChangeTargetTime = 0;
  }

  respawn() {
    this.health = this.maxHealth;
    this.armor = this.maxArmor;
    this.x = 400 + Math.random() * (MAP_WIDTH - 800);
    this.y = 400 + Math.random() * (MAP_HEIGHT - 800);
    this.ammo = WEAPONS[this.weapon].magSize;
    this.isReloading = false;
  }

  update(room) {
    if (this.health <= 0) return;

    if (this.isBot) {
      this.updateBotAI(room);
    }

    // Aim Angle calculation
    if (!this.isBot) {
      this.angle = Math.atan2(this.inputs.aimY - this.y, this.inputs.aimX - this.x);
    }

    // Sprint & Stamina
    let speed = this.baseSpeed;
    if (this.inputs.sprint && this.stamina > 10) {
      this.isSprinting = true;
      speed *= 1.5;
      this.stamina = Math.max(0, this.stamina - 1.2);
    } else {
      this.isSprinting = false;
      this.stamina = Math.min(100, this.stamina + 0.6);
    }

    // Movement Vectors
    let moveX = 0;
    let moveY = 0;
    if (this.inputs.up) moveY -= 1;
    if (this.inputs.down) moveY += 1;
    if (this.inputs.left) moveX -= 1;
    if (this.inputs.right) moveX += 1;

    if (moveX !== 0 && moveY !== 0) {
      moveX *= 0.7071;
      moveY *= 0.7071;
    }

    const newX = this.x + moveX * speed;
    const newY = this.y + moveY * speed;

    // Obstacle Collisions
    if (!this.checkWallCollision(newX, this.y)) this.x = newX;
    if (!this.checkWallCollision(this.x, newY)) this.y = newY;

    // Boundary clamps
    this.x = Math.max(50, Math.min(MAP_WIDTH - 50, this.x));
    this.y = Math.max(50, Math.min(MAP_HEIGHT - 50, this.y));

    // Reloading
    const wp = WEAPONS[this.weapon];
    if (this.inputs.reload && !this.isReloading && this.ammo < wp.magSize) {
      this.startReload();
    }

    if (this.isReloading && Date.now() >= this.reloadEnd) {
      this.ammo = wp.magSize;
      this.isReloading = false;
    }

    // Auto-reload when empty
    if (this.ammo <= 0 && !this.isReloading) {
      this.startReload();
    }

    // Shooting
    if (this.inputs.shoot && !this.isReloading && this.ammo > 0) {
      if (Date.now() - this.lastShotTime >= wp.fireRate) {
        this.fireWeapon(room);
      }
    }
  }

  startReload() {
    this.isReloading = true;
    this.reloadEnd = Date.now() + WEAPONS[this.weapon].reloadTime;
  }

  fireWeapon(room) {
    const wp = WEAPONS[this.weapon];
    this.lastShotTime = Date.now();
    this.ammo--;

    const muzzleDist = 28;
    const muzzleX = this.x + Math.cos(this.angle) * muzzleDist;
    const muzzleY = this.y + Math.sin(this.angle) * muzzleDist;

    for (let i = 0; i < wp.bulletCount; i++) {
      const spread = (Math.random() - 0.5) * wp.spread * 2;
      const bulletAngle = this.angle + spread;
      room.projectiles.push(new Projectile(
        this.id,
        muzzleX,
        muzzleY,
        bulletAngle,
        this.weapon,
        wp.speed,
        wp.damage,
        wp.color,
        wp.isExplosive
      ));
    }

    room.events.push({
      type: 'shoot',
      x: muzzleX,
      y: muzzleY,
      weapon: this.weapon,
      angle: this.angle
    });
  }

  checkWallCollision(x, y) {
    for (const obs of OBSTACLES) {
      if (
        x + this.radius > obs.x &&
        x - this.radius < obs.x + obs.w &&
        y + this.radius > obs.y &&
        y - this.radius < obs.y + obs.h
      ) {
        return true;
      }
    }
    return false;
  }

  takeDamage(amount, attackerId, room) {
    if (this.health <= 0) return;

    if (this.armor > 0) {
      const remain = amount - this.armor;
      this.armor = Math.max(0, this.armor - amount);
      if (remain > 0) this.health = Math.max(0, this.health - remain);
    } else {
      this.health = Math.max(0, this.health - amount);
    }

    room.events.push({ type: 'hit', x: this.x, y: this.y, amount });

    if (this.health <= 0) {
      this.deaths++;
      if (attackerId) {
        const killer = room.players.get(attackerId);
        if (killer) {
          killer.kills++;
          killer.score += 100;
          room.events.push({
            type: 'kill',
            killerName: killer.name,
            victimName: this.name,
            weapon: killer.weapon
          });
        }
      }
      room.events.push({ type: 'death', x: this.x, y: this.y });

      setTimeout(() => {
        if (room.state === 'PLAYING') this.respawn();
      }, 3000);
    }
  }

  updateBotAI(room) {
    // Find closest enemy player or zombie
    let closestTarget = null;
    let closestDist = 900;

    room.players.forEach(other => {
      if (other.id !== this.id && other.health > 0) {
        const d = Math.hypot(other.x - this.x, other.y - this.y);
        if (d < closestDist) {
          closestDist = d;
          closestTarget = other;
        }
      }
    });

    if (closestTarget) {
      this.angle = Math.atan2(closestTarget.y - this.y, closestTarget.x - this.x);

      // Move toward or strafe
      if (closestDist > 300) {
        this.inputs.up = true;
        this.inputs.down = false;
      } else if (closestDist < 120) {
        this.inputs.up = false;
        this.inputs.down = true;
      } else {
        this.inputs.up = false;
        this.inputs.down = false;
      }

      this.inputs.left = Math.random() > 0.6;
      this.inputs.right = !this.inputs.left && Math.random() > 0.6;
      this.inputs.shoot = closestDist < 600;
    } else {
      // Wander around map
      this.inputs.up = true;
      this.inputs.shoot = false;
      if (Math.random() > 0.96) {
        this.angle += (Math.random() - 0.5) * 1.5;
      }
    }
  }
}

// Projectile Class
class Projectile {
  constructor(ownerId, x, y, angle, weaponType, speed, damage, color, isExplosive = false) {
    this.id = Math.random().toString(36).substr(2, 6);
    this.ownerId = ownerId;
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.weaponType = weaponType;
    this.speed = speed;
    this.damage = damage;
    this.color = color;
    this.isExplosive = isExplosive;
    this.life = 75; // frames to live
  }

  update(room) {
    this.life--;
    if (this.life <= 0) return false;

    this.x += Math.cos(this.angle) * this.speed;
    this.y += Math.sin(this.angle) * this.speed;

    // Obstacle collision
    for (const obs of OBSTACLES) {
      if (this.x > obs.x && this.x < obs.x + obs.w && this.y > obs.y && this.y < obs.y + obs.h) {
        if (this.isExplosive) {
          this.explode(room);
        }
        return false;
      }
    }

    // Player collision
    for (const p of room.players.values()) {
      if (p.id !== this.ownerId && p.health > 0) {
        if (Math.hypot(p.x - this.x, p.y - this.y) < p.radius + 6) {
          p.takeDamage(this.damage, this.ownerId, room);
          if (this.isExplosive) this.explode(room);
          return false;
        }
      }
    }

    // Zombie collision (if in Horde mode)
    for (const z of room.zombies) {
      if (z.health > 0 && Math.hypot(z.x - this.x, z.y - this.y) < z.radius + 6) {
        z.takeDamage(this.damage, this.ownerId, room);
        if (this.isExplosive) this.explode(room);
        return false;
      }
    }

    return true;
  }

  explode(room) {
    room.events.push({ type: 'explosion', x: this.x, y: this.y, radius: 100 });
    room.players.forEach(p => {
      const d = Math.hypot(p.x - this.x, p.y - this.y);
      if (d < 120 && p.health > 0) {
        p.takeDamage(Math.floor((1 - d / 120) * 80), this.ownerId, room);
      }
    });
    room.zombies.forEach(z => {
      const d = Math.hypot(z.x - this.x, z.y - this.y);
      if (d < 120 && z.health > 0) {
        z.takeDamage(Math.floor((1 - d / 120) * 100), this.ownerId, room);
      }
    });
  }
}

// Zombie Class (for Deadrise / Horde Mode)
class Zombie {
  constructor(x, y, wave = 1) {
    this.id = Math.random().toString(36).substr(2, 6);
    this.x = x;
    this.y = y;
    this.angle = 0;
    this.speed = 2.8 + Math.random() * 1.5 + (wave * 0.2);
    this.health = 50 + wave * 15;
    this.maxHealth = this.health;
    this.damage = 18;
    this.radius = 18;
    this.lastAttack = 0;
    this.color = '#ff3366';
  }

  update(room) {
    if (this.health <= 0) return;

    // Target closest live player
    let closestPlayer = null;
    let minDist = Infinity;

    room.players.forEach(p => {
      if (p.health > 0) {
        const d = Math.hypot(p.x - this.x, p.y - this.y);
        if (d < minDist) {
          minDist = d;
          closestPlayer = p;
        }
      }
    });

    if (closestPlayer) {
      this.angle = Math.atan2(closestPlayer.y - this.y, closestPlayer.x - this.x);
      const newX = this.x + Math.cos(this.angle) * this.speed;
      const newY = this.y + Math.sin(this.angle) * this.speed;

      this.x = newX;
      this.y = newY;

      // Attack player on contact
      if (minDist < this.radius + closestPlayer.radius + 4) {
        if (Date.now() - this.lastAttack > 800) {
          this.lastAttack = Date.now();
          closestPlayer.takeDamage(this.damage, null, room);
        }
      }
    }
  }

  takeDamage(amount, attackerId, room) {
    this.health -= amount;
    room.events.push({ type: 'hit', x: this.x, y: this.y, amount });

    if (this.health <= 0) {
      if (attackerId) {
        const killer = room.players.get(attackerId);
        if (killer) {
          killer.score += 50;
          killer.kills++;
        }
      }
      room.events.push({ type: 'zombie_death', x: this.x, y: this.y });
    }
  }
}

// Power-up Crate / Drop
class PowerupItem {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type; // 'shotgun', 'sniper', 'plasma', 'medkit', 'armor'
    this.active = true;
    this.respawnTimer = 0;
  }

  collect(player) {
    this.active = false;
    this.respawnTimer = 450; // ~10s

    if (['shotgun', 'sniper', 'plasma'].includes(this.type)) {
      player.weapon = this.type;
      player.ammo = WEAPONS[this.type].magSize;
    } else if (this.type === 'medkit') {
      player.health = Math.min(player.maxHealth, player.health + 60);
    } else if (this.type === 'armor') {
      player.armor = player.maxArmor;
    }
  }
}

// Game Room Manager
class GameRoom {
  constructor(code, hostSocketId) {
    this.code = code;
    this.hostId = hostSocketId;
    this.state = 'LOBBY';
    this.mode = 'DEADSHOT_PVP'; // 'DEADSHOT_PVP' or 'DEADRISE_HORDE'
    this.players = new Map();
    this.projectiles = [];
    this.zombies = [];
    this.wave = 1;
    this.events = [];
    this.gameLoopInterval = null;
    this.matchTimeLeft = 300; // 5 minute rounds

    // Initial power-up spawns
    this.powerups = [
      new PowerupItem(1300, 900, 'plasma'),
      new PowerupItem(425, 375, 'shotgun'),
      new PowerupItem(2175, 375, 'sniper'),
      new PowerupItem(425, 1425, 'medkit'),
      new PowerupItem(2175, 1425, 'armor'),
      new PowerupItem(1300, 350, 'medkit'),
      new PowerupItem(1300, 1450, 'armor')
    ];
  }

  addPlayer(id, name, color, isHost = false, isBot = false) {
    const player = new Survivor(id, name, color, isHost, isBot);
    this.players.set(id, player);
    return player;
  }

  removePlayer(id) {
    this.players.delete(id);
    if (this.hostId === id) {
      const next = Array.from(this.players.values()).find(p => !p.isBot);
      if (next) {
        this.hostId = next.id;
        next.isHost = true;
      }
    }
  }

  startGame(io) {
    this.state = 'PLAYING';
    this.matchTimeLeft = 300;
    this.projectiles = [];
    this.zombies = [];
    this.wave = 1;

    this.players.forEach(p => p.respawn());

    if (this.mode === 'DEADRISE_HORDE') {
      this.spawnZombieWave();
    }

    if (this.gameLoopInterval) clearInterval(this.gameLoopInterval);

    this.gameLoopInterval = setInterval(() => {
      this.updateLoop(io);
    }, 1000 / 45); // 45 FPS Engine Loop
  }

  spawnZombieWave() {
    const zombieCount = 8 + this.wave * 4;
    for (let i = 0; i < zombieCount; i++) {
      const spawnX = Math.random() > 0.5 ? 80 : MAP_WIDTH - 80;
      const spawnY = Math.random() * MAP_HEIGHT;
      this.zombies.push(new Zombie(spawnX, spawnY, this.wave));
    }
  }

  updateLoop(io) {
    if (this.state !== 'PLAYING') {
      clearInterval(this.gameLoopInterval);
      return;
    }

    // Update Players
    this.players.forEach(p => p.update(this));

    // Update Projectiles
    this.projectiles = this.projectiles.filter(proj => proj.update(this));

    // Update Zombies (Horde mode)
    this.zombies = this.zombies.filter(z => z.health > 0);
    this.zombies.forEach(z => z.update(this));

    if (this.mode === 'DEADRISE_HORDE' && this.zombies.length === 0) {
      this.wave++;
      this.events.push({ type: 'wave_clear', wave: this.wave });
      setTimeout(() => this.spawnZombieWave(), 3000);
    }

    // Update Powerups
    this.powerups.forEach(p => {
      if (!p.active) {
        p.respawnTimer--;
        if (p.respawnTimer <= 0) p.active = true;
      } else {
        for (const player of this.players.values()) {
          if (player.health > 0 && Math.hypot(player.x - p.x, player.y - p.y) < player.radius + 18) {
            p.collect(player);
            this.events.push({ type: 'powerup', x: p.x, y: p.y, item: p.type, playerId: player.id });
            break;
          }
        }
      }
    });

    // Broadcast Snapshot
    const snapshot = this.getSnapshot();
    io.to(this.code).emit('game_tick', snapshot);
    this.events = [];
  }

  getSnapshot() {
    return {
      state: this.state,
      mode: this.mode,
      wave: this.wave,
      players: Array.from(this.players.values()).map(p => ({
        id: p.id,
        name: p.name,
        color: p.color,
        x: Math.round(p.x),
        y: Math.round(p.y),
        angle: Number(p.angle.toFixed(3)),
        health: Math.round(p.health),
        armor: Math.round(p.armor),
        stamina: Math.round(p.stamina),
        weapon: p.weapon,
        ammo: p.ammo,
        isReloading: p.isReloading,
        kills: p.kills,
        score: p.score
      })),
      projectiles: this.projectiles.map(pr => ({
        id: pr.id,
        x: Math.round(pr.x),
        y: Math.round(pr.y),
        color: pr.color,
        weaponType: pr.weaponType
      })),
      zombies: this.zombies.map(z => ({
        id: z.id,
        x: Math.round(z.x),
        y: Math.round(z.y),
        angle: Number(z.angle.toFixed(2)),
        health: z.health,
        maxHealth: z.maxHealth
      })),
      powerups: this.powerups.map(p => ({
        x: p.x,
        y: p.y,
        type: p.type,
        active: p.active
      })),
      events: this.events
    };
  }
}

// Socket Connection Events
io.on('connection', (socket) => {
  let currentRoomCode = null;

  // 1. Create Room
  socket.on('create_room', ({ playerName, playerColor, gameMode }) => {
    const code = generateRoomCode();
    const room = new GameRoom(code, socket.id);
    if (gameMode) room.mode = gameMode;
    rooms.set(code, room);
    currentRoomCode = code;

    socket.join(code);
    const p = room.addPlayer(socket.id, playerName || 'Striker_1', playerColor || '#00f0ff', true);

    socket.emit('room_created', {
      roomCode: code,
      player: { id: p.id, name: p.name, color: p.color, isHost: true },
      mode: room.mode,
      map: { width: MAP_WIDTH, height: MAP_HEIGHT, obstacles: OBSTACLES }
    });
  });

  // 2. Join Room (Direct or via shared link ?room=CODE)
  socket.on('join_room', ({ roomCode, playerName, playerColor }) => {
    const cleanCode = (roomCode || '').toUpperCase().trim();
    const room = rooms.get(cleanCode);

    if (!room) {
      socket.emit('join_error', { message: 'Invalid Match Code! Please check link or code.' });
      return;
    }

    currentRoomCode = cleanCode;
    socket.join(cleanCode);
    const p = room.addPlayer(socket.id, playerName || `Shooter_${room.players.size + 1}`, playerColor || '#ff007f', false);

    socket.emit('room_joined', {
      roomCode: cleanCode,
      player: { id: p.id, name: p.name, color: p.color, isHost: false },
      mode: room.mode,
      map: { width: MAP_WIDTH, height: MAP_HEIGHT, obstacles: OBSTACLES }
    });

    io.to(cleanCode).emit('lobby_update', {
      players: Array.from(room.players.values()).map(pl => ({ id: pl.id, name: pl.name, color: pl.color, isBot: pl.isBot, isHost: pl.isHost }))
    });

    // If game already running, automatically drop the joined player into the live battle
    if (room.state === 'PLAYING') {
      socket.emit('game_started');
    }
  });

  // 3. Add AI Combat Bot
  socket.on('add_bot', () => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room || room.hostId !== socket.id) return;

    const botNames = ['ShadowGhost', 'ApexSniper', 'Vortex99', 'NovaStrike', 'DoomReaper'];
    const botColors = ['#ff3366', '#ffb703', '#00f59b', '#9d4edd', '#ff007f'];
    const bName = botNames[room.players.size % botNames.length];
    const bColor = botColors[room.players.size % botColors.length];

    room.addPlayer(`bot_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`, `🤖 ${bName}`, bColor, false, true);

    io.to(currentRoomCode).emit('lobby_update', {
      players: Array.from(room.players.values()).map(pl => ({ id: pl.id, name: pl.name, color: pl.color, isBot: pl.isBot, isHost: pl.isHost }))
    });
  });

  // 4. Start Game
  socket.on('start_game', () => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room || room.hostId !== socket.id) return;

    room.startGame(io);
    io.to(currentRoomCode).emit('game_started');
  });

  // 5. Player Inputs (Movement, Aim, Shoot, Sprint, Reload)
  socket.on('player_input', (inputs) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;
    const player = room.players.get(socket.id);
    if (player) {
      player.inputs = { ...player.inputs, ...inputs };
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    if (currentRoomCode) {
      const room = rooms.get(currentRoomCode);
      if (room) {
        room.removePlayer(socket.id);
        if (room.players.size === 0) {
          if (room.gameLoopInterval) clearInterval(room.gameLoopInterval);
          rooms.delete(currentRoomCode);
        } else {
          io.to(currentRoomCode).emit('lobby_update', {
            players: Array.from(room.players.values()).map(pl => ({ id: pl.id, name: pl.name, color: pl.color, isBot: pl.isBot, isHost: pl.isHost }))
          });
        }
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`🎯 DEADSHOT / DEADRISE .IO Shooter running on http://localhost:${PORT}`);
});
