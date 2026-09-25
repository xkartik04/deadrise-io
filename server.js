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

// 3D Arena Bounds (Centered at 0, 0, bounds -120 to +120)
const MAP_BOUNDS = 120;

// Weapons Configuration
const WEAPONS = {
  scar: { name: 'SCAR-H Assault', damage: 34, headshotMult: 2.2, fireRate: 110, magSize: 30, maxAmmo: 180, reloadTime: 1800, cost: 0, color: '#ffb703' },
  shotgun: { name: 'SPAS-12 Shotgun', damage: 20, headshotMult: 1.8, fireRate: 650, magSize: 8, maxAmmo: 48, reloadTime: 2200, pellets: 7, cost: 1200, color: '#ff007f' },
  sniper: { name: 'AWM Heavy Sniper', damage: 125, headshotMult: 3.0, fireRate: 1000, magSize: 5, maxAmmo: 25, reloadTime: 2400, cost: 2000, color: '#00f0ff' },
  plasma: { name: 'Plasma Launcher', damage: 85, headshotMult: 1.5, fireRate: 750, magSize: 6, maxAmmo: 24, reloadTime: 2000, isExplosive: true, cost: 2800, color: '#00f59b' }
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

// 3D Player Class
class FPSPlayer {
  constructor(id, name, color, isHost = false, isBot = false) {
    this.id = id;
    this.name = name;
    this.color = color || '#00f0ff';
    this.isHost = isHost;
    this.isBot = isBot;

    // 3D Coordinates
    this.x = (Math.random() - 0.5) * 40;
    this.y = 1.6; // Eye height
    this.z = (Math.random() - 0.5) * 40;
    this.yaw = 0; // Horizontal look angle
    this.pitch = 0; // Vertical look angle

    // Vitals
    this.health = 100;
    this.maxHealth = 100;
    this.armor = 50;
    this.cash = 1000;
    this.kills = 0;
    this.score = 0;
    this.deaths = 0;

    // Weapon Inventory
    this.currentWeapon = 'scar';
    this.ammo = WEAPONS.scar.magSize;
    this.reserveAmmo = WEAPONS.scar.maxAmmo;
    this.isReloading = false;
    this.reloadEndTime = 0;
    this.lastShotTime = 0;

    // Inputs
    this.inputs = {
      forward: false, backward: false, left: false, right: false,
      shoot: false, sprint: false, reload: false,
      yaw: 0, pitch: 0
    };
  }

  respawn() {
    this.health = this.maxHealth;
    this.armor = 50;
    this.x = (Math.random() - 0.5) * 50;
    this.z = (Math.random() - 0.5) * 50;
    this.ammo = WEAPONS[this.currentWeapon].magSize;
    this.isReloading = false;
  }

  update(room) {
    if (this.health <= 0) return;

    if (this.isBot) {
      this.updateBotAI(room);
    } else {
      this.yaw = this.inputs.yaw;
      this.pitch = this.inputs.pitch;
    }

    // Movement in 3D
    let moveSpeed = this.inputs.sprint ? 0.22 : 0.14;
    let dx = 0;
    let dz = 0;

    if (this.inputs.forward) {
      dx -= Math.sin(this.yaw) * moveSpeed;
      dz -= Math.cos(this.yaw) * moveSpeed;
    }
    if (this.inputs.backward) {
      dx += Math.sin(this.yaw) * moveSpeed;
      dz += Math.cos(this.yaw) * moveSpeed;
    }
    if (this.inputs.left) {
      dx -= Math.cos(this.yaw) * moveSpeed;
      dz += Math.sin(this.yaw) * moveSpeed;
    }
    if (this.inputs.right) {
      dx += Math.cos(this.yaw) * moveSpeed;
      dz -= Math.sin(this.yaw) * moveSpeed;
    }

    this.x = Math.max(-MAP_BOUNDS + 4, Math.min(MAP_BOUNDS - 4, this.x + dx));
    this.z = Math.max(-MAP_BOUNDS + 4, Math.min(MAP_BOUNDS - 4, this.z + dz));

    // Reloading
    if (this.isReloading && Date.now() >= this.reloadEndTime) {
      const wp = WEAPONS[this.currentWeapon];
      const needed = wp.magSize - this.ammo;
      const amount = Math.min(needed, this.reserveAmmo);
      this.ammo += amount;
      this.reserveAmmo -= amount;
      this.isReloading = false;
    }

    // Auto-reload when empty
    if (this.ammo <= 0 && !this.isReloading && this.reserveAmmo > 0) {
      this.startReload();
    }
  }

  startReload() {
    if (this.isReloading || this.ammo >= WEAPONS[this.currentWeapon].magSize || this.reserveAmmo <= 0) return;
    this.isReloading = true;
    this.reloadEndTime = Date.now() + WEAPONS[this.currentWeapon].reloadTime;
  }

  updateBotAI(room) {
    let closestZombie = null;
    let minDist = 45;

    room.zombies.forEach(z => {
      if (z.health > 0) {
        const d = Math.hypot(z.x - this.x, z.z - this.z);
        if (d < minDist) {
          minDist = d;
          closestZombie = z;
        }
      }
    });

    if (closestZombie) {
      this.yaw = Math.atan2(this.x - closestZombie.x, this.z - closestZombie.z);
      if (minDist > 12) {
        this.inputs.forward = true;
        this.inputs.backward = false;
      } else if (minDist < 6) {
        this.inputs.forward = false;
        this.inputs.backward = true;
      } else {
        this.inputs.forward = false;
        this.inputs.backward = false;
      }
      // Shoot at zombie
      if (Date.now() - this.lastShotTime > WEAPONS[this.currentWeapon].fireRate + 80) {
        room.handlePlayerShot(this.id, closestZombie.id, false);
      }
    } else {
      this.inputs.forward = true;
      if (Math.random() > 0.95) this.yaw += (Math.random() - 0.5) * 1.5;
    }
  }
}

// 3D Zombie Class
class FPSZombie {
  constructor(x, z, wave = 1, isBoss = false) {
    this.id = Math.random().toString(36).substr(2, 6);
    this.x = x;
    this.y = 0;
    this.z = z;
    this.yaw = 0;
    this.isBoss = isBoss;
    this.speed = isBoss ? 0.08 : (0.09 + Math.random() * 0.04 + wave * 0.005);
    this.health = isBoss ? (400 + wave * 150) : (50 + wave * 18);
    this.maxHealth = this.health;
    this.damage = isBoss ? 35 : 18;
    this.lastAttackTime = 0;
  }

  update(room) {
    if (this.health <= 0) return;

    // Find closest player
    let target = null;
    let minDist = Infinity;

    room.players.forEach(p => {
      if (p.health > 0) {
        const d = Math.hypot(p.x - this.x, p.z - this.z);
        if (d < minDist) {
          minDist = d;
          target = p;
        }
      }
    });

    if (target) {
      this.yaw = Math.atan2(target.x - this.x, target.z - this.z);
      this.x += Math.sin(this.yaw) * this.speed;
      this.z += Math.cos(this.yaw) * this.speed;

      // Attack if close
      if (minDist < 2.0 && Date.now() - this.lastAttackTime > 900) {
        this.lastAttackTime = Date.now();
        this.attackPlayer(target, room);
      }
    }
  }

  attackPlayer(player, room) {
    if (player.armor > 0) {
      const rem = this.damage - player.armor;
      player.armor = Math.max(0, player.armor - this.damage);
      if (rem > 0) player.health = Math.max(0, player.health - rem);
    } else {
      player.health = Math.max(0, player.health - this.damage);
    }

    room.events.push({ type: 'player_hit', playerId: player.id, health: player.health, armor: player.armor });

    if (player.health <= 0) {
      player.deaths++;
      room.events.push({ type: 'player_down', playerName: player.name });
      setTimeout(() => {
        if (room.state === 'PLAYING') player.respawn();
      }, 4000);
    }
  }
}

// 3D Game Room Manager
class FPSRoom {
  constructor(code, hostSocketId) {
    this.code = code;
    this.hostId = hostSocketId;
    this.state = 'LOBBY'; // LOBBY, PLAYING, GAMEOVER
    this.mode = 'DEADRISE_HORDE'; // 'DEADRISE_HORDE' or 'DEADSHOT_PVP'
    this.wave = 1;
    this.maxWaves = 10;
    this.players = new Map();
    this.zombies = [];
    this.events = [];
    this.gameLoopInterval = null;
    this.zombiesRemainingToSpawn = 0;
    this.spawnTimer = 0;
  }

  addPlayer(id, name, color, isHost = false, isBot = false) {
    const p = new FPSPlayer(id, name, color, isHost, isBot);
    this.players.set(id, p);
    return p;
  }

  removePlayer(id) {
    this.players.delete(id);
    if (this.hostId === id) {
      const next = Array.from(this.players.values()).find(pl => !pl.isBot);
      if (next) {
        this.hostId = next.id;
        next.isHost = true;
      }
    }
  }

  startGame(io) {
    this.state = 'PLAYING';
    this.wave = 1;
    this.zombies = [];
    this.events = [];

    this.players.forEach(p => p.respawn());
    this.startWave(this.wave);

    if (this.gameLoopInterval) clearInterval(this.gameLoopInterval);
    this.gameLoopInterval = setInterval(() => this.tick(io), 1000 / 30); // 30Hz network sync
  }

  startWave(waveNum) {
    this.wave = waveNum;
    const isBoss = (waveNum % 5 === 0);
    this.zombiesRemainingToSpawn = isBoss ? 12 + waveNum * 4 : 8 + waveNum * 3;
    this.events.push({ type: 'wave_start', wave: this.wave, isBoss: isBoss });
  }

  tick(io) {
    if (this.state !== 'PLAYING') {
      clearInterval(this.gameLoopInterval);
      return;
    }

    // Spawn Zombies progressively
    this.spawnTimer++;
    if (this.zombiesRemainingToSpawn > 0 && this.spawnTimer % 20 === 0) {
      this.zombiesRemainingToSpawn--;
      const angle = Math.random() * Math.PI * 2;
      const dist = 45 + Math.random() * 25;
      const isBoss = (this.wave % 5 === 0 && this.zombiesRemainingToSpawn === 0);
      this.zombies.push(new FPSZombie(Math.sin(angle) * dist, Math.cos(angle) * dist, this.wave, isBoss));
    }

    // Update Players
    this.players.forEach(p => p.update(this));

    // Update Zombies
    this.zombies = this.zombies.filter(z => z.health > 0);
    this.zombies.forEach(z => z.update(this));

    // Check Wave Completion
    if (this.zombies.length === 0 && this.zombiesRemainingToSpawn === 0) {
      if (this.wave < this.maxWaves) {
        this.wave++;
        this.events.push({ type: 'wave_cleared', wave: this.wave });
        // Award Cash bonus to all players
        this.players.forEach(p => { p.cash += 500 + this.wave * 100; });
        setTimeout(() => this.startWave(this.wave), 4000);
      } else {
        this.state = 'VICTORY';
        io.to(this.code).emit('game_victory');
      }
    }

    // Broadcast 3D snapshot
    const snap = this.getSnapshot();
    io.to(this.code).emit('fps_tick', snap);
    this.events = [];
  }

  handlePlayerShot(playerId, targetZombieId, isHeadshot) {
    const player = this.players.get(playerId);
    if (!player || player.ammo <= 0 || player.isReloading) return;

    const wp = WEAPONS[player.currentWeapon];
    if (Date.now() - player.lastShotTime < wp.fireRate) return;

    player.lastShotTime = Date.now();
    player.ammo--;

    // Broadcast shoot sound/muzzle event
    this.events.push({ type: 'player_shot', playerId: player.id, weapon: player.currentWeapon, isHeadshot });

    if (targetZombieId) {
      const z = this.zombies.find(zm => zm.id === targetZombieId);
      if (z && z.health > 0) {
        let dmg = wp.damage;
        if (isHeadshot) dmg = Math.floor(dmg * wp.headshotMult);

        z.health -= dmg;
        player.score += isHeadshot ? 150 : 75;
        player.cash += isHeadshot ? 120 : 60;

        this.events.push({
          type: 'zombie_hit',
          zombieId: z.id,
          damage: dmg,
          isHeadshot,
          x: z.x, y: z.y + 1.2, z: z.z
        });

        if (z.health <= 0) {
          player.kills++;
          player.cash += z.isBoss ? 500 : 100;
          this.events.push({ type: 'zombie_killed', zombieId: z.id, killerName: player.name });
        }
      }
    }
  }

  buyWeapon(playerId, weaponKey) {
    const p = this.players.get(playerId);
    const wp = WEAPONS[weaponKey];
    if (p && wp && p.cash >= wp.cost) {
      p.cash -= wp.cost;
      p.currentWeapon = weaponKey;
      p.ammo = wp.magSize;
      p.reserveAmmo = wp.maxAmmo;
      p.isReloading = false;
      return true;
    }
    return false;
  }

  buyAmmo(playerId) {
    const p = this.players.get(playerId);
    if (p && p.cash >= 300) {
      p.cash -= 300;
      p.reserveAmmo = WEAPONS[p.currentWeapon].maxAmmo;
      return true;
    }
    return false;
  }

  buyArmor(playerId) {
    const p = this.players.get(playerId);
    if (p && p.cash >= 400 && p.armor < 50) {
      p.cash -= 400;
      p.armor = 50;
      return true;
    }
    return false;
  }

  getSnapshot() {
    return {
      state: this.state,
      wave: this.wave,
      zombiesCount: this.zombies.length + this.zombiesRemainingToSpawn,
      players: Array.from(this.players.values()).map(p => ({
        id: p.id,
        name: p.name,
        color: p.color,
        x: Number(p.x.toFixed(2)),
        y: Number(p.y.toFixed(2)),
        z: Number(p.z.toFixed(2)),
        yaw: Number(p.yaw.toFixed(3)),
        pitch: Number(p.pitch.toFixed(3)),
        health: p.health,
        armor: p.armor,
        cash: p.cash,
        weapon: p.currentWeapon,
        ammo: p.ammo,
        reserveAmmo: p.reserveAmmo,
        isReloading: p.isReloading,
        kills: p.kills,
        score: p.score
      })),
      zombies: this.zombies.map(z => ({
        id: z.id,
        x: Number(z.x.toFixed(2)),
        y: Number(z.y.toFixed(2)),
        z: Number(z.z.toFixed(2)),
        yaw: Number(z.yaw.toFixed(3)),
        health: z.health,
        maxHealth: z.maxHealth,
        isBoss: z.isBoss
      })),
      events: this.events
    };
  }
}

// Socket Events
io.on('connection', (socket) => {
  let currentRoomCode = null;

  // Create Room
  socket.on('create_room', ({ playerName, playerColor }) => {
    const code = generateRoomCode();
    const room = new FPSRoom(code, socket.id);
    rooms.set(code, room);
    currentRoomCode = code;

    socket.join(code);
    const p = room.addPlayer(socket.id, playerName || 'Soldier_1', playerColor || '#00f0ff', true);

    socket.emit('room_created', {
      roomCode: code,
      player: { id: p.id, name: p.name, color: p.color, isHost: true },
      weapons: WEAPONS
    });
  });

  // Join Room (Direct or via ?room=CODE link)
  socket.on('join_room', ({ roomCode, playerName, playerColor }) => {
    const cleanCode = (roomCode || '').toUpperCase().trim();
    const room = rooms.get(cleanCode);

    if (!room) {
      socket.emit('join_error', { message: 'Invalid Match Code! Please check link or code.' });
      return;
    }

    currentRoomCode = cleanCode;
    socket.join(cleanCode);
    const p = room.addPlayer(socket.id, playerName || `Soldier_${room.players.size + 1}`, playerColor || '#ff007f', false);

    socket.emit('room_joined', {
      roomCode: cleanCode,
      player: { id: p.id, name: p.name, color: p.color, isHost: false },
      weapons: WEAPONS
    });

    io.to(cleanCode).emit('lobby_update', {
      players: Array.from(room.players.values()).map(pl => ({ id: pl.id, name: pl.name, color: pl.color, isBot: pl.isBot, isHost: pl.isHost }))
    });

    if (room.state === 'PLAYING') {
      socket.emit('game_started');
    }
  });

  // Add AI Bot
  socket.on('add_bot', () => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room || room.hostId !== socket.id) return;

    const botNames = ['Delta_AI', 'Recon_Bot', 'Bravo_AI', 'Ghost_Bot'];
    const botColors = ['#ff3366', '#ffb703', '#00f59b', '#ff007f'];
    const bName = botNames[room.players.size % botNames.length];
    const bColor = botColors[room.players.size % botColors.length];

    room.addPlayer(`bot_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`, `🤖 ${bName}`, bColor, false, true);

    io.to(currentRoomCode).emit('lobby_update', {
      players: Array.from(room.players.values()).map(pl => ({ id: pl.id, name: pl.name, color: pl.color, isBot: pl.isBot, isHost: pl.isHost }))
    });
  });

  // Start Game
  socket.on('start_game', () => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room || room.hostId !== socket.id) return;

    room.startGame(io);
    io.to(currentRoomCode).emit('game_started');
  });

  // Player Inputs & Shooting
  socket.on('player_input', (inputs) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;
    const p = room.players.get(socket.id);
    if (p) p.inputs = { ...p.inputs, ...inputs };
  });

  socket.on('player_shoot_target', ({ targetZombieId, isHeadshot }) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (room && room.state === 'PLAYING') {
      room.handlePlayerShot(socket.id, targetZombieId, isHeadshot);
    }
  });

  socket.on('player_reload', () => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (room) {
      const p = room.players.get(socket.id);
      if (p) p.startReload();
    }
  });

  // Arsenal Purchases
  socket.on('buy_weapon', ({ weaponKey }) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (room) room.buyWeapon(socket.id, weaponKey);
  });

  socket.on('buy_ammo', () => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (room) room.buyAmmo(socket.id);
  });

  socket.on('buy_armor', () => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (room) room.buyArmor(socket.id);
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
  console.log(`🎯🧟 DEADRISE 3D FPS Shooter running on http://localhost:${PORT}`);
});
