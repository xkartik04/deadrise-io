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

// --- MAP & TRACK DEFINITION ---
// Arena Track Size: 2400 x 1600
const TRACK = {
  width: 2400,
  height: 1600,
  checkpoints: [
    { id: 0, x: 300, y: 350, radius: 180 },
    { id: 1, x: 1200, y: 250, radius: 180 },
    { id: 2, x: 2100, y: 350, radius: 180 },
    { id: 3, x: 2150, y: 1250, radius: 180 },
    { id: 4, x: 1200, y: 1350, radius: 180 },
    { id: 5, x: 300, y: 1250, radius: 180 }
  ],
  boostPads: [
    { x: 750, y: 280, w: 100, h: 50, angle: 0 },
    { x: 1650, y: 280, w: 100, h: 50, angle: 0 },
    { x: 2150, y: 800, w: 50, h: 100, angle: Math.PI / 2 },
    { x: 1650, y: 1320, w: 100, h: 50, angle: Math.PI },
    { x: 750, y: 1320, w: 100, h: 50, angle: Math.PI },
    { x: 280, y: 800, w: 50, h: 100, angle: -Math.PI / 2 }
  ],
  obstacles: [
    // Center island obstacles
    { x: 650, y: 550, w: 1100, h: 500, type: 'building' },
    // Outer boundaries
    { x: 0, y: 0, w: 2400, h: 60, type: 'wall' },
    { x: 0, y: 1540, w: 2400, h: 60, type: 'wall' },
    { x: 0, y: 0, w: 60, h: 1600, type: 'wall' },
    { x: 2340, y: 0, w: 60, h: 1600, type: 'wall' }
  ],
  powerupSpawns: [
    { x: 450, y: 300, type: 'rocket' },
    { x: 1450, y: 260, type: 'nitro' },
    { x: 2150, y: 600, type: 'shield' },
    { x: 2050, y: 1300, type: 'laser' },
    { x: 1000, y: 1350, type: 'repair' },
    { x: 300, y: 1000, type: 'mine' },
    { x: 1200, y: 800, type: 'rocket' } // Center shortcut
  ]
};

// Rooms Registry
const rooms = new Map();

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return rooms.has(code) ? generateRoomCode() : code;
}

// Vehicle Class & Physics
class CombatCar {
  constructor(id, name, color, isHost = false, isBot = false, spawnIndex = 0) {
    this.id = id;
    this.name = name;
    this.color = color || '#00f0ff';
    this.isHost = isHost;
    this.isBot = isBot;

    // Spawn Grid positioning
    const spawnX = 250 + (spawnIndex % 2) * 80;
    const spawnY = 320 + Math.floor(spawnIndex / 2) * 90;

    this.x = spawnX;
    this.y = spawnY;
    this.angle = 0; // Radians
    this.speed = 0;
    this.maxSpeed = 12;
    this.reverseMaxSpeed = -5;
    this.accel = 0.35;
    this.decel = 0.2;
    this.handling = 0.055;
    this.width = 38;
    this.height = 22;

    // Combat Stats
    this.maxHealth = 100;
    this.health = 100;
    this.shield = 50;
    this.maxShield = 50;
    this.nitro = 100; // 0 to 100
    this.maxNitro = 100;
    this.isBoosting = false;
    this.isDrifting = false;
    this.isShooting = false;
    this.lastShotTime = 0;
    this.weaponType = 'gatling'; // 'gatling', 'rocket', 'laser', 'mine'
    this.ammo = Infinity;
    this.specialAmmo = 3;

    // Race Progress
    this.lap = 1;
    this.maxLaps = 3;
    this.currentCheckpoint = 0;
    this.finished = false;
    this.finishTime = 0;
    this.kills = 0;
    this.deaths = 0;
    this.score = 0;

    // Input States
    this.inputs = {
      up: false,
      down: false,
      left: false,
      right: false,
      boost: false,
      shoot: false,
      drift: false
    };

    // Bot AI variables
    this.botTargetCheckpoint = 0;
    this.botShootCooldown = 0;
  }

  respawn(spawnIndex = 0) {
    this.health = this.maxHealth;
    this.shield = this.maxShield;
    this.speed = 0;
    const currentCP = TRACK.checkpoints[this.currentCheckpoint] || TRACK.checkpoints[0];
    this.x = currentCP.x + (Math.random() - 0.5) * 60;
    this.y = currentCP.y + (Math.random() - 0.5) * 60;
  }

  update(room) {
    if (this.health <= 0) return;

    if (this.isBot) {
      this.updateBotAI(room);
    }

    // --- ACCELERATION & REVERSE ---
    let currentMax = this.maxSpeed;
    let currentAccel = this.accel;

    // Nitro Boost
    if (this.inputs.boost && this.nitro > 0) {
      this.isBoosting = true;
      this.nitro = Math.max(0, this.nitro - 1.2);
      currentMax *= 1.45;
      currentAccel *= 1.8;
    } else {
      this.isBoosting = false;
      this.nitro = Math.min(this.maxNitro, this.nitro + 0.2); // Passive nitro regen
    }

    if (this.inputs.up) {
      this.speed = Math.min(currentMax, this.speed + currentAccel);
    } else if (this.inputs.down) {
      this.speed = Math.max(this.reverseMaxSpeed, this.speed - currentAccel * 0.8);
    } else {
      // Natural drag / friction
      if (this.speed > 0) {
        this.speed = Math.max(0, this.speed - this.decel);
      } else if (this.speed < 0) {
        this.speed = Math.min(0, this.speed + this.decel);
      }
    }

    // --- STEERING & DRIFTING ---
    let turnRate = this.handling * (Math.abs(this.speed) / this.maxSpeed + 0.3);
    if (this.inputs.drift && Math.abs(this.speed) > 4) {
      this.isDrifting = true;
      turnRate *= 1.4;
      this.speed *= 0.985; // Slight drift friction
    } else {
      this.isDrifting = false;
    }

    if (this.inputs.left) {
      this.angle -= turnRate * (this.speed >= 0 ? 1 : -1);
    }
    if (this.inputs.right) {
      this.angle += turnRate * (this.speed >= 0 ? 1 : -1);
    }

    // Move Car
    this.x += Math.cos(this.angle) * this.speed;
    this.y += Math.sin(this.angle) * this.speed;

    // Boundary constraints
    this.x = Math.max(80, Math.min(TRACK.width - 80, this.x));
    this.y = Math.max(80, Math.min(TRACK.height - 80, this.y));

    // Obstacle Wall Collisions
    TRACK.obstacles.forEach(obs => {
      if (
        this.x > obs.x &&
        this.x < obs.x + obs.w &&
        this.y > obs.y &&
        this.y < obs.y + obs.h
      ) {
        // Bounce back
        this.speed = -this.speed * 0.5;
        this.x -= Math.cos(this.angle) * 8;
        this.y -= Math.sin(this.angle) * 8;
        this.takeDamage(5, null, room);
      }
    });

    // Boost Pad Collisions
    TRACK.boostPads.forEach(pad => {
      const dx = this.x - pad.x;
      const dy = this.y - pad.y;
      if (Math.abs(dx) < 60 && Math.abs(dy) < 60) {
        this.speed = this.maxSpeed * 1.6;
        this.nitro = Math.min(this.maxNitro, this.nitro + 20);
      }
    });

    // Checkpoint & Lap Progress
    const targetCP = TRACK.checkpoints[this.currentCheckpoint];
    if (targetCP) {
      const distToCP = Math.hypot(this.x - targetCP.x, this.y - targetCP.y);
      if (distToCP < targetCP.radius) {
        this.currentCheckpoint++;
        if (this.currentCheckpoint >= TRACK.checkpoints.length) {
          this.currentCheckpoint = 0;
          this.lap++;
          if (this.lap > this.maxLaps && !this.finished) {
            this.finished = true;
            this.finishTime = Date.now() - room.gameStartTime;
            room.checkGameCompletion();
          }
        }
      }
    }

    // Shooting Action
    if (this.inputs.shoot && Date.now() - this.lastShotTime > 180) {
      this.fireWeapon(room);
    }
  }

  updateBotAI(room) {
    const targetCP = TRACK.checkpoints[this.botTargetCheckpoint];
    if (targetCP) {
      const targetAngle = Math.atan2(targetCP.y - this.y, targetCP.x - this.x);
      let diffAngle = targetAngle - this.angle;
      while (diffAngle < -Math.PI) diffAngle += Math.PI * 2;
      while (diffAngle > Math.PI) diffAngle -= Math.PI * 2;

      this.inputs.up = true;
      this.inputs.left = diffAngle < -0.15;
      this.inputs.right = diffAngle > 0.15;
      this.inputs.boost = Math.abs(diffAngle) < 0.2 && Math.random() > 0.4;
      this.inputs.drift = Math.abs(diffAngle) > 0.8;

      const dist = Math.hypot(targetCP.x - this.x, targetCP.y - this.y);
      if (dist < 200) {
        this.botTargetCheckpoint = (this.botTargetCheckpoint + 1) % TRACK.checkpoints.length;
      }
    }

    // Bot Auto-Shoot at closest opponent
    if (Date.now() > this.botShootCooldown) {
      let closestOpponent = null;
      let closestDist = 500;
      room.cars.forEach(other => {
        if (other.id !== this.id && other.health > 0) {
          const d = Math.hypot(other.x - this.x, other.y - this.y);
          if (d < closestDist) {
            closestDist = d;
            closestOpponent = other;
          }
        }
      });

      if (closestOpponent) {
        const oppAngle = Math.atan2(closestOpponent.y - this.y, closestOpponent.x - this.x);
        let angleDiff = oppAngle - this.angle;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

        if (Math.abs(angleDiff) < 0.35) {
          this.inputs.shoot = true;
          this.botShootCooldown = Date.now() + 600 + Math.random() * 800;
        } else {
          this.inputs.shoot = false;
        }
      }
    }
  }

  fireWeapon(room) {
    this.lastShotTime = Date.now();
    const muzzleX = this.x + Math.cos(this.angle) * (this.width / 2 + 5);
    const muzzleY = this.y + Math.sin(this.angle) * (this.width / 2 + 5);

    if (this.weaponType === 'rocket' && this.specialAmmo > 0) {
      this.specialAmmo--;
      room.projectiles.push(new Projectile(this.id, muzzleX, muzzleY, this.angle, 'rocket', 18, 45, this.color));
      if (this.specialAmmo <= 0) this.weaponType = 'gatling';
    } else if (this.weaponType === 'laser' && this.specialAmmo > 0) {
      this.specialAmmo--;
      room.projectiles.push(new Projectile(this.id, muzzleX, muzzleY, this.angle, 'laser', 26, 60, '#ff007f'));
      if (this.specialAmmo <= 0) this.weaponType = 'gatling';
    } else if (this.weaponType === 'mine' && this.specialAmmo > 0) {
      this.specialAmmo--;
      const rearX = this.x - Math.cos(this.angle) * 30;
      const rearY = this.y - Math.sin(this.angle) * 30;
      room.projectiles.push(new Projectile(this.id, rearX, rearY, 0, 'mine', 0, 75, '#ffb703'));
      if (this.specialAmmo <= 0) this.weaponType = 'gatling';
    } else {
      // Standard Plasma Gatling
      room.projectiles.push(new Projectile(this.id, muzzleX, muzzleY, this.angle + (Math.random() - 0.5) * 0.08, 'bullet', 22, 12, this.color));
    }

    room.events.push({ type: 'shoot', x: muzzleX, y: muzzleY, weapon: this.weaponType, color: this.color });
  }

  takeDamage(amount, attackerId, room) {
    if (this.health <= 0) return;

    if (this.shield > 0) {
      const remaining = amount - this.shield;
      this.shield = Math.max(0, this.shield - amount);
      if (remaining > 0) {
        this.health = Math.max(0, this.health - remaining);
      }
    } else {
      this.health = Math.max(0, this.health - amount);
    }

    room.events.push({ type: 'hit', x: this.x, y: this.y, amount });

    if (this.health <= 0) {
      this.deaths++;
      if (attackerId) {
        const attacker = room.cars.get(attackerId);
        if (attacker) {
          attacker.kills++;
          attacker.score += 500;
          room.events.push({
            type: 'kill',
            killerName: attacker.name,
            victimName: this.name,
            weapon: attacker.weaponType
          });
        }
      }
      room.events.push({ type: 'explosion', x: this.x, y: this.y });

      // Respawn after 2.5 seconds
      setTimeout(() => {
        if (room.state === 'PLAYING') {
          this.respawn();
        }
      }, 2500);
    }
  }
}

// Projectile Class
class Projectile {
  constructor(ownerId, x, y, angle, type, speed, damage, color) {
    this.id = Math.random().toString(36).substr(2, 6);
    this.ownerId = ownerId;
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.type = type;
    this.speed = speed;
    this.damage = damage;
    this.color = color || '#00f0ff';
    this.radius = type === 'mine' ? 14 : (type === 'rocket' ? 8 : 4);
    this.life = type === 'mine' ? 600 : 90; // frames to live
    this.createdAt = Date.now();
  }

  update(room) {
    this.life--;
    if (this.life <= 0) return false;

    if (this.type !== 'mine') {
      this.x += Math.cos(this.angle) * this.speed;
      this.y += Math.sin(this.angle) * this.speed;
    }

    // Check Wall Collisions
    for (const obs of TRACK.obstacles) {
      if (this.x > obs.x && this.x < obs.x + obs.w && this.y > obs.y && this.y < obs.y + obs.h) {
        room.events.push({ type: 'explosion', x: this.x, y: this.y, radius: 20 });
        return false;
      }
    }

    // Check Car Collisions
    for (const car of room.cars.values()) {
      if (car.id !== this.ownerId && car.health > 0) {
        const dist = Math.hypot(car.x - this.x, car.y - this.y);
        if (dist < car.width / 2 + this.radius) {
          car.takeDamage(this.damage, this.ownerId, room);
          car.speed *= 0.6; // Impact knockback / stun
          room.events.push({ type: 'explosion', x: this.x, y: this.y, radius: this.type === 'rocket' ? 40 : 15 });
          return false;
        }
      }
    }

    return true;
  }
}

// Powerup Spawner Manager
class PowerupItem {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type; // 'rocket', 'laser', 'nitro', 'shield', 'repair', 'mine'
    this.active = true;
    this.respawnTimer = 0;
  }

  collect(car) {
    this.active = false;
    this.respawnTimer = 600; // 10 seconds at 60fps

    switch (this.type) {
      case 'rocket':
        car.weaponType = 'rocket';
        car.specialAmmo = 4;
        break;
      case 'laser':
        car.weaponType = 'laser';
        car.specialAmmo = 5;
        break;
      case 'mine':
        car.weaponType = 'mine';
        car.specialAmmo = 3;
        break;
      case 'nitro':
        car.nitro = car.maxNitro;
        break;
      case 'shield':
        car.shield = car.maxShield;
        break;
      case 'repair':
        car.health = Math.min(car.maxHealth, car.health + 50);
        break;
    }
  }
}

// Game Room Management
class GameRoom {
  constructor(code, hostSocketId) {
    this.code = code;
    this.hostId = hostSocketId;
    this.state = 'LOBBY'; // LOBBY, COUNTDOWN, PLAYING, GAMEOVER
    this.gameMode = 'DEATH_RACE'; // 'DEATH_RACE' or 'DEMOLITION_ARENA'
    this.cars = new Map();
    this.projectiles = [];
    this.powerups = TRACK.powerupSpawns.map(p => new PowerupItem(p.x, p.y, p.type));
    this.events = [];
    this.gameStartTime = 0;
    this.gameLoopInterval = null;
    this.countdown = 3;
  }

  addPlayer(id, name, color, isHost = false, isBot = false) {
    const spawnIndex = this.cars.size;
    const car = new CombatCar(id, name, color, isHost, isBot, spawnIndex);
    this.cars.set(id, car);
    return car;
  }

  removePlayer(id) {
    this.cars.delete(id);
    if (this.hostId === id) {
      const next = Array.from(this.cars.values()).find(c => !c.isBot);
      if (next) {
        this.hostId = next.id;
        next.isHost = true;
      }
    }
  }

  startGame(io) {
    this.state = 'COUNTDOWN';
    this.countdown = 3;
    this.projectiles = [];
    this.events = [];

    // Reset cars to starting grid
    let idx = 0;
    this.cars.forEach(car => {
      car.health = car.maxHealth;
      car.shield = car.maxShield;
      car.nitro = car.maxNitro;
      car.lap = 1;
      car.currentCheckpoint = 0;
      car.finished = false;
      car.score = 0;
      car.kills = 0;
      car.deaths = 0;
      car.x = 250 + (idx % 2) * 80;
      car.y = 320 + Math.floor(idx / 2) * 90;
      car.angle = 0;
      car.speed = 0;
      idx++;
    });

    io.to(this.code).emit('countdown_start', { countdown: this.countdown });

    const countInterval = setInterval(() => {
      this.countdown--;
      io.to(this.code).emit('countdown_tick', { countdown: this.countdown });
      if (this.countdown <= 0) {
        clearInterval(countInterval);
        this.state = 'PLAYING';
        this.gameStartTime = Date.now();
        this.runGameLoop(io);
      }
    }, 1000);
  }

  runGameLoop(io) {
    if (this.gameLoopInterval) clearInterval(this.gameLoopInterval);

    this.gameLoopInterval = setInterval(() => {
      if (this.state !== 'PLAYING') {
        clearInterval(this.gameLoopInterval);
        return;
      }

      // Update Cars
      this.cars.forEach(car => car.update(this));

      // Update Projectiles
      this.projectiles = this.projectiles.filter(proj => proj.update(this));

      // Update Powerups
      this.powerups.forEach(p => {
        if (!p.active) {
          p.respawnTimer--;
          if (p.respawnTimer <= 0) p.active = true;
        } else {
          // Check collision with cars
          for (const car of this.cars.values()) {
            if (car.health > 0 && Math.hypot(car.x - p.x, car.y - p.y) < 35) {
              p.collect(car);
              this.events.push({ type: 'powerup', x: p.x, y: p.y, powerType: p.type, playerId: car.id });
              break;
            }
          }
        }
      });

      // Broadcast Snapshot at 30-60Hz
      const snapshot = this.getSnapshot();
      io.to(this.code).emit('game_tick', snapshot);
      this.events = []; // Flush frame events
    }, 1000 / 45); // 45 FPS authoritative tick
  }

  checkGameCompletion() {
    const finishedCount = Array.from(this.cars.values()).filter(c => c.finished).length;
    if (finishedCount >= 1 && this.cars.size <= 2 || finishedCount >= Math.ceil(this.cars.size * 0.7)) {
      this.state = 'GAMEOVER';
      if (this.gameLoopInterval) clearInterval(this.gameLoopInterval);
      io.to(this.code).emit('game_over', this.getLeaderboard());
    }
  }

  getSnapshot() {
    return {
      state: this.state,
      cars: Array.from(this.cars.values()).map(c => ({
        id: c.id,
        name: c.name,
        color: c.color,
        x: Math.round(c.x),
        y: Math.round(c.y),
        angle: Number(c.angle.toFixed(3)),
        speed: Number(c.speed.toFixed(1)),
        health: Math.round(c.health),
        shield: Math.round(c.shield),
        nitro: Math.round(c.nitro),
        isBoosting: c.isBoosting,
        isDrifting: c.isDrifting,
        weaponType: c.weaponType,
        specialAmmo: c.specialAmmo,
        lap: c.lap,
        currentCheckpoint: c.currentCheckpoint,
        kills: c.kills,
        finished: c.finished
      })),
      projectiles: this.projectiles.map(p => ({
        id: p.id,
        x: Math.round(p.x),
        y: Math.round(p.y),
        angle: Number(p.angle.toFixed(2)),
        type: p.type,
        color: p.color
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

  getLeaderboard() {
    return Array.from(this.cars.values())
      .sort((a, b) => {
        if (a.finished && !b.finished) return -1;
        if (!a.finished && b.finished) return 1;
        if (a.finished && b.finished) return a.finishTime - b.finishTime;
        if (a.lap !== b.lap) return b.lap - a.lap;
        if (a.currentCheckpoint !== b.currentCheckpoint) return b.currentCheckpoint - a.currentCheckpoint;
        return b.kills - a.kills;
      })
      .map((c, rank) => ({
        rank: rank + 1,
        id: c.id,
        name: c.name,
        color: c.color,
        kills: c.kills,
        lap: c.lap,
        finishTime: c.finishTime ? (c.finishTime / 1000).toFixed(2) + 's' : 'DNF'
      }));
  }
}

// Socket IO Handlers
io.on('connection', (socket) => {
  let currentRoomCode = null;

  socket.on('create_room', ({ playerName, carColor }) => {
    const code = generateRoomCode();
    const room = new GameRoom(code, socket.id);
    rooms.set(code, room);
    currentRoomCode = code;

    socket.join(code);
    const car = room.addPlayer(socket.id, playerName || 'Player 1', carColor || '#00f0ff', true);

    socket.emit('room_created', {
      roomCode: code,
      player: { id: car.id, name: car.name, color: car.color, isHost: true },
      track: TRACK
    });
  });

  socket.on('join_room', ({ roomCode, playerName, carColor }) => {
    const cleanCode = (roomCode || '').toUpperCase().trim();
    const room = rooms.get(cleanCode);

    if (!room) {
      socket.emit('join_error', { message: 'Invalid Room Code! Please check and try again.' });
      return;
    }

    if (room.state !== 'LOBBY') {
      socket.emit('join_error', { message: 'Battle already in progress! Please wait for next race.' });
      return;
    }

    currentRoomCode = cleanCode;
    socket.join(cleanCode);
    const car = room.addPlayer(socket.id, playerName || `Racer_${room.cars.size + 1}`, carColor || '#ff007f', false);

    socket.emit('room_joined', {
      roomCode: cleanCode,
      player: { id: car.id, name: car.name, color: car.color, isHost: false },
      track: TRACK
    });

    io.to(cleanCode).emit('player_joined_lobby', {
      players: Array.from(room.cars.values()).map(c => ({ id: c.id, name: c.name, color: c.color, isBot: c.isBot, isHost: c.isHost }))
    });
  });

  socket.on('add_bot', () => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room || room.hostId !== socket.id || room.state !== 'LOBBY') return;

    const botNames = ['CyberViper', 'NeonBlaze', 'DoomBuggy', 'PlasmaPhantom', 'TurboTitan'];
    const botColors = ['#ff3366', '#ffb703', '#00f59b', '#b5179e', '#7209b7'];
    const botIdx = room.cars.size;
    const name = botNames[botIdx % botNames.length];
    const color = botColors[botIdx % botColors.length];

    room.addPlayer(`bot_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`, `🤖 ${name}`, color, false, true);

    io.to(currentRoomCode).emit('player_joined_lobby', {
      players: Array.from(room.cars.values()).map(c => ({ id: c.id, name: c.name, color: c.color, isBot: c.isBot, isHost: c.isHost }))
    });
  });

  socket.on('start_game', () => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room || room.hostId !== socket.id) return;
    room.startGame(io);
  });

  socket.on('player_input', (inputs) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;
    const car = room.cars.get(socket.id);
    if (car) {
      car.inputs = { ...car.inputs, ...inputs };
    }
  });

  socket.on('disconnect', () => {
    if (currentRoomCode) {
      const room = rooms.get(currentRoomCode);
      if (room) {
        room.removePlayer(socket.id);
        if (room.cars.size === 0) {
          if (room.gameLoopInterval) clearInterval(room.gameLoopInterval);
          rooms.delete(currentRoomCode);
        } else {
          io.to(currentRoomCode).emit('player_joined_lobby', {
            players: Array.from(room.cars.values()).map(c => ({ id: c.id, name: c.name, color: c.color, isBot: c.isBot, isHost: c.isHost }))
          });
        }
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`🏎️💥 CYBER NITRO: COMBAT RACER Server running on http://localhost:${PORT}`);
});
