const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Port configuration
const PORT = process.env.PORT || 3000;

// --- INVENTIONS DATABASE (Extensive, hilarious & culturally witty) ---
const INVENTIONS_DATABASE = [
  {
    id: 'chai_wifi',
    title: 'AI Smart Chai Dispenser with Sarcastic Advice',
    category: 'Daily Life & Food Tech',
    realDescription: 'A cutting-edge electric kettle that brews authentic masala chai in 45 seconds while roasting your life choices and offering unsolicited marriage or career advice in 4 different languages.',
    imposterPrompt: 'You only know it involves hot beverages and giving weird unsolicited feedback. Make up a convincing gadget and pitch it confidently!',
    baseValue: 4500,
    tags: ['Chai', 'AI Roaster', 'Morning Energy']
  },
  {
    id: 'traffic_drone',
    title: 'Personal Traffic-Jumping Hover Umbrella',
    category: 'Extreme Commute & Transport',
    realDescription: 'A reinforced carbon-fiber umbrella equipped with quad-copter turbo blades that lifts you 15 feet into the air to casually bypass 2-hour rush hour gridlocks while shielding you from rain.',
    imposterPrompt: 'You only know it helps people escape bad traffic situations using flying or floating gimmicks. Pitch your wild solution!',
    baseValue: 7000,
    tags: ['Flying', 'Anti-Traffic', 'Weatherproof']
  },
  {
    id: 'snooze_slap',
    title: 'The Wake-Up Slap-O-Matic Bedside Alarm',
    category: 'Health & Productivity',
    realDescription: 'An ultra-gentle silicone mechanical hand attached to your alarm clock that gives you progressively firmer slaps, plays loud wedding brass band music, and transfers ₹500 to your arch-enemy if you hit snooze.',
    imposterPrompt: 'You only know this device forces heavy sleepers to wake up immediately using extreme consequences. Pitch your invention without knowing the exact mechanism!',
    baseValue: 3200,
    tags: ['Alarm', 'Anti-Procrastination', 'Discipline']
  },
  {
    id: 'aunty_shield',
    title: 'The "Beta Shaadi Kab Hai?" Acoustic Noise Jammer',
    category: 'Social Survival Gear',
    realDescription: 'Discreet smart earbuds that use inverted phase cancellation to instantly replace intrusive questions about your marriage, salary, and marks with soothing lofi ambient beats or fake urgent phone calls.',
    imposterPrompt: 'You only know it protects people from uncomfortable family/social conversations at gatherings. Pitch your invention convincingly!',
    baseValue: 6200,
    tags: ['Social Life', 'Audio Jammer', 'Peace of Mind']
  },
  {
    id: 'panipuri_meter',
    title: 'The Infinite Pani-Puri Speed Feeder & Flavor Synthesizer',
    category: 'Culinary Masterpiece',
    realDescription: 'A robotic countertop kiosk with calibrated hydraulic nozzles that dispenses perfectly crisp puris with custom spice-level mint water at a blazing speed of 1 puri every 2.3 seconds with automatic extra sukha puri bonus.',
    imposterPrompt: 'You only know it automates a famous street food experience with crazy high-tech speed and spice control. Bluff your way through the pitch!',
    baseValue: 8500,
    tags: ['Street Food', 'Robotics', 'Flavor Tech']
  },
  {
    id: 'ac_remote_finder',
    title: 'Quantum AC Remote GPS Tracker & Solar Blanket',
    category: 'Home & Comfort',
    realDescription: 'A micro-beacon that attaches to your AC remote, shines a laser bat-signal on the ceiling when lost under couch cushions, and features an integrated cooling fabric blanket that adjusts to the exact room temperature.',
    imposterPrompt: 'You only know it solves the eternal household struggle of living room comfort and lost controllers. Pitch your gadget!',
    baseValue: 2800,
    tags: ['Home Tech', 'Cooling', 'Beacon']
  },
  {
    id: 'exam_telepath',
    title: 'The Emergency Brain Defogger & Formula Projector',
    category: 'Education & High Stakes',
    realDescription: 'A sleek pair of augmented-reality spectacles that detects blank-mind panic during high-stakes presentations or exams and projects your forgotten notes onto the inside of your eyelids.',
    imposterPrompt: 'You only know it helps people look smart and recall memory during stressful tests or interviews. Pitch your invention with confidence!',
    baseValue: 9000,
    tags: ['Smart Glasses', 'Memory Hack', 'Confidence']
  },
  {
    id: 'haggling_bot',
    title: 'The AI Master Bargaining Ear-Piece',
    category: 'Street Smart Commerce',
    realDescription: 'A micro-earpiece that analyzes street vendor body language and whispers ruthless haggling comebacks (*"Bhaiya, pados wali dukaan pe 50% sasta mil raha hai"*) until you get maximum discount.',
    imposterPrompt: 'You only know it is a device designed to win shopping negotiations and get rock-bottom prices anywhere. Pitch it!',
    baseValue: 5500,
    tags: ['Bargaining', 'AI Negotiator', 'Money Saver']
  },
  {
    id: 'sock_teleporter',
    title: 'The Quantum Single-Sock Dimension Portal',
    category: 'Physics & Mystery',
    realDescription: 'A magnetic laundry basket attachment that opens a microscopic wormhole to retrieve all the single socks that mysteriously vanish inside washing machines into alternate realities.',
    imposterPrompt: 'You only know this invention solves a bizarre universal household mystery involving clothes. Invent your pitch!',
    baseValue: 4000,
    tags: ['Quantum', 'Laundry', 'Mystery']
  },
  {
    id: 'meeting_cloner',
    title: 'Holographic "Nodding Yes" Office Clone',
    category: 'Corporate & Remote Work',
    realDescription: 'A photorealistic AI hologram projector that attends your 3-hour Zoom meetings, occasionally nods enthusiastically, says *"Let us take this offline"*, and takes meeting notes while you nap.',
    imposterPrompt: 'You only know it helps remote employees survive boring video meetings without doing real work. Pitch it!',
    baseValue: 9500,
    tags: ['Remote Work', 'AI Clone', 'Office Hack']
  }
];

// AI Bot names and auto-pitch generators for solo/testing play
const AI_BOT_PROFILES = [
  { name: 'ChaiBot-3000', avatar: '☕', bio: 'Caffeine-fueled inventor' },
  { name: 'SharmaJi_AI', avatar: '🧠', bio: 'Has 99% accuracy in everything' },
  { name: 'JugaadKing_99', avatar: '🛠️', bio: 'Fixes rockets with duct tape' },
  { name: 'CryptoDidi', avatar: '🚀', bio: 'Thinks everything runs on Web3' },
  { name: 'DesiCyberpunk', avatar: '⚡', bio: 'Neon lights and fast deals' }
];

// Room storage
const rooms = new Map();

// Helper to generate unique 4-character room codes
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return rooms.has(code) ? generateRoomCode() : code;
}

// Room Management Class
class GameRoom {
  constructor(code, hostSocketId) {
    this.code = code;
    this.hostId = hostSocketId;
    this.players = new Map(); // socketId -> PlayerData
    this.state = 'LOBBY'; // LOBBY, BLUEPRINT, PITCH, SHOWCASE, VOTING, AUCTION, REVEAL, GAMEOVER
    this.roundNumber = 0;
    this.maxRounds = 3;
    this.timer = null;
    this.timeLeft = 0;
    this.currentInvention = null;
    this.imposterIds = [];
    this.pitches = new Map(); // playerId -> { pitchText, submittedAt }
    this.votes = new Map(); // voterId -> targetPlayerId
    this.auction = {
      active: false,
      currentBid: 0,
      highestBidderId: null,
      passedPlayers: new Set(),
      timer: 15
    };
    this.createdAt = Date.now();
  }

  addPlayer(socketId, name, avatar, isHost = false, isBot = false) {
    const player = {
      id: socketId,
      name: name || `Player_${this.players.size + 1}`,
      avatar: avatar || '🧑‍🚀',
      score: 0,
      cash: 10000,
      isHost: isHost,
      isBot: isBot,
      isReady: isBot,
      isImposter: false,
      connected: true,
      lastPitch: '',
      inventory: []
    };
    this.players.set(socketId, player);
    return player;
  }

  removePlayer(socketId) {
    this.players.delete(socketId);
    if (this.hostId === socketId) {
      // Reassign host if players remain
      const nextPlayer = Array.from(this.players.values()).find(p => !p.isBot);
      if (nextPlayer) {
        this.hostId = nextPlayer.id;
        nextPlayer.isHost = true;
      }
    }
  }

  getPublicState() {
    return {
      code: this.code,
      hostId: this.hostId,
      state: this.state,
      roundNumber: this.roundNumber,
      maxRounds: this.maxRounds,
      timeLeft: this.timeLeft,
      currentInvention: this.currentInvention ? {
        id: this.currentInvention.id,
        title: this.currentInvention.title,
        category: this.currentInvention.category,
        baseValue: this.currentInvention.baseValue,
        tags: this.currentInvention.tags
      } : null,
      players: Array.from(this.players.values()).map(p => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        score: p.score,
        cash: p.cash,
        isHost: p.isHost,
        isBot: p.isBot,
        isReady: p.isReady,
        hasSubmittedPitch: this.pitches.has(p.id),
        hasVoted: this.votes.has(p.id),
        inventoryCount: p.inventory.length
      })),
      pitches: Array.from(this.pitches.entries()).map(([playerId, data]) => {
        const player = this.players.get(playerId);
        return {
          playerId,
          playerName: player ? player.name : 'Unknown',
          playerAvatar: player ? player.avatar : '❓',
          pitchText: data.pitchText
        };
      }),
      auction: {
        currentBid: this.auction.currentBid,
        highestBidderId: this.auction.highestBidderId,
        highestBidderName: this.auction.highestBidderId && this.players.get(this.auction.highestBidderId) 
          ? this.players.get(this.auction.highestBidderId).name 
          : 'None',
        passedCount: this.auction.passedPlayers.size,
        totalBidders: this.players.size
      }
    };
  }

  startNextRound(io) {
    this.roundNumber++;
    if (this.roundNumber > this.maxRounds) {
      this.state = 'GAMEOVER';
      io.to(this.code).emit('game_state_update', this.getPublicState());
      return;
    }

    // Pick random invention
    const randomInv = INVENTIONS_DATABASE[Math.floor(Math.random() * INVENTIONS_DATABASE.length)];
    this.currentInvention = randomInv;
    this.pitches.clear();
    this.votes.clear();

    // Select Imposter
    const playerList = Array.from(this.players.values());
    playerList.forEach(p => p.isImposter = false);

    const imposterCount = playerList.length >= 7 ? 2 : 1;
    const shuffled = [...playerList].sort(() => 0.5 - Math.random());
    this.imposterIds = shuffled.slice(0, imposterCount).map(p => p.id);
    this.imposterIds.forEach(id => {
      const p = this.players.get(id);
      if (p) p.isImposter = true;
    });

    // Move to BLUEPRINT state
    this.state = 'BLUEPRINT';
    this.timeLeft = 12;

    // Send secret personalized blueprint to each player
    playerList.forEach(p => {
      if (p.isImposter) {
        io.to(p.id).emit('secret_role_assigned', {
          isImposter: true,
          roleTitle: '🕵️ SECRET CHOR / IMPOSTER',
          prompt: randomInv.imposterPrompt,
          titleHint: randomInv.category,
          baseValue: randomInv.baseValue
        });
      } else {
        io.to(p.id).emit('secret_role_assigned', {
          isImposter: false,
          roleTitle: '💡 MASTER INVENTOR',
          title: randomInv.title,
          description: randomInv.realDescription,
          category: randomInv.category,
          baseValue: randomInv.baseValue
        });
      }
    });

    io.to(this.code).emit('game_state_update', this.getPublicState());

    this.runTimer(io, 12, () => {
      this.startPitchPhase(io);
    });
  }

  startPitchPhase(io) {
    this.state = 'PITCH';
    this.timeLeft = 35;
    io.to(this.code).emit('game_state_update', this.getPublicState());

    // Trigger AI bots to auto-generate funny pitches
    this.players.forEach(p => {
      if (p.isBot) {
        setTimeout(() => {
          let botPitch = '';
          if (p.isImposter) {
            const fakePitches = [
              'Trust me bro, this device uses supersonic quantum vibes to solve all your problems in 3 seconds flat!',
              'Guaranteed 1000% satisfaction or I will personally refund your grandmother!',
              'This is the top viral gadget on the internet right now, buy it before Sharma Ji buys all stock!',
              'Engineered with pure desi genius and zero bugs. Ready to dominate Shark Tank!'
            ];
            botPitch = fakePitches[Math.floor(Math.random() * fakePitches.length)];
          } else {
            const realPitches = [
              `Our ${this.currentInvention.title} changes everything. Never worry again!`,
              `Say goodbye to daily stress with the certified ${this.currentInvention.title}!`,
              `Why suffer in silence when you can automate bliss with our patented ${this.currentInvention.tags[0]} tech?`,
              `Limited production run for the smartest minds in town. Get yours now!`
            ];
            botPitch = realPitches[Math.floor(Math.random() * realPitches.length)];
          }
          this.pitches.set(p.id, { pitchText: botPitch, submittedAt: Date.now() });
          io.to(this.code).emit('game_state_update', this.getPublicState());
        }, 3000 + Math.random() * 4000);
      }
    });

    this.runTimer(io, 35, () => {
      this.startShowcasePhase(io);
    });
  }

  startShowcasePhase(io) {
    this.state = 'SHOWCASE';
    this.timeLeft = 18;
    io.to(this.code).emit('game_state_update', this.getPublicState());

    this.runTimer(io, 18, () => {
      this.startVotingPhase(io);
    });
  }

  startVotingPhase(io) {
    this.state = 'VOTING';
    this.timeLeft = 25;
    this.votes.clear();
    io.to(this.code).emit('game_state_update', this.getPublicState());

    // AI bot voting
    this.players.forEach(p => {
      if (p.isBot) {
        setTimeout(() => {
          const candidateList = Array.from(this.players.values()).filter(cand => cand.id !== p.id);
          if (candidateList.length > 0) {
            const randomTarget = candidateList[Math.floor(Math.random() * candidateList.length)];
            this.votes.set(p.id, randomTarget.id);
            io.to(this.code).emit('game_state_update', this.getPublicState());
          }
        }, 3000 + Math.random() * 5000);
      }
    });

    this.runTimer(io, 25, () => {
      this.startAuctionPhase(io);
    });
  }

  startAuctionPhase(io) {
    this.state = 'AUCTION';
    this.auction = {
      active: true,
      currentBid: this.currentInvention.baseValue,
      highestBidderId: null,
      passedPlayers: new Set(),
      timer: 15
    };
    this.timeLeft = 15;
    io.to(this.code).emit('game_state_update', this.getPublicState());

    // AI Bot Bidding Behavior
    this.triggerBotAuctionLoop(io);

    this.runAuctionTimer(io);
  }

  triggerBotAuctionLoop(io) {
    if (this.state !== 'AUCTION') return;
    this.players.forEach(p => {
      if (p.isBot && !this.auction.passedPlayers.has(p.id)) {
        const shouldBid = Math.random() > 0.45 && p.cash > this.auction.currentBid + 500;
        if (shouldBid) {
          setTimeout(() => {
            if (this.state === 'AUCTION' && !this.auction.passedPlayers.has(p.id)) {
              this.handleBid(p.id, 500, io);
            }
          }, 2000 + Math.random() * 4000);
        } else if (Math.random() > 0.7) {
          this.auction.passedPlayers.add(p.id);
          io.to(this.code).emit('game_state_update', this.getPublicState());
        }
      }
    });
  }

  handleBid(playerId, increment, io) {
    const player = this.players.get(playerId);
    if (!player || this.state !== 'AUCTION') return false;
    const newBid = this.auction.currentBid + increment;
    if (player.cash >= newBid) {
      this.auction.currentBid = newBid;
      this.auction.highestBidderId = playerId;
      this.auction.timer = Math.max(8, this.auction.timer + 3); // Reset auction timer slightly on bids
      this.timeLeft = this.auction.timer;
      io.to(this.code).emit('bid_placed', {
        playerName: player.name,
        playerAvatar: player.avatar,
        amount: newBid
      });
      io.to(this.code).emit('game_state_update', this.getPublicState());
      return true;
    }
    return false;
  }

  runAuctionTimer(io) {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      this.auction.timer--;
      this.timeLeft = this.auction.timer;

      // Check if all players passed or timer is 0
      const activeBidders = Array.from(this.players.keys()).filter(id => !this.auction.passedPlayers.has(id));
      if (this.auction.timer <= 0 || (activeBidders.length <= 1 && this.auction.highestBidderId)) {
        clearInterval(this.timer);
        this.finishRoundReveal(io);
        return;
      }

      io.to(this.code).emit('timer_tick', { timeLeft: this.timeLeft });
    }, 1000);
  }

  finishRoundReveal(io) {
    this.state = 'REVEAL';
    this.timeLeft = 15;

    // 1. Calculate Voting Results (Did players catch the Imposter?)
    const voteCounts = new Map(); // targetId -> count
    this.votes.forEach((targetId) => {
      voteCounts.set(targetId, (voteCounts.get(targetId) || 0) + 1);
    });

    let mostVotedId = null;
    let maxVotes = 0;
    voteCounts.forEach((count, targetId) => {
      if (count > maxVotes) {
        maxVotes = count;
        mostVotedId = targetId;
      }
    });

    const imposterCaught = this.imposterIds.includes(mostVotedId);
    const roundResults = {
      imposterIds: this.imposterIds,
      imposters: this.imposterIds.map(id => this.players.get(id)).filter(Boolean),
      mostVotedPlayer: mostVotedId ? this.players.get(mostVotedId) : null,
      imposterCaught: imposterCaught,
      auctionWinner: this.auction.highestBidderId ? this.players.get(this.auction.highestBidderId) : null,
      winningBid: this.auction.currentBid,
      invention: this.currentInvention,
      scoreDeltas: {}
    };

    // Award Points
    this.players.forEach(p => {
      let delta = 0;
      if (p.isImposter) {
        if (!imposterCaught) {
          delta += 1500; // Imposter fooled everyone!
          p.cash += 3000;
        } else {
          delta += 300; // Consolation
        }
      } else {
        // Honest players who correctly voted for an imposter get points
        const votedFor = this.votes.get(p.id);
        if (votedFor && this.imposterIds.includes(votedFor)) {
          delta += 800; // Detective bonus
          p.cash += 1000;
        }
      }

      // Pitch bonus if submitted
      if (this.pitches.has(p.id)) {
        delta += 200;
      }

      p.score += delta;
      roundResults.scoreDeltas[p.id] = delta;
    });

    // Deduct auction cash and award item to winning bidder
    if (this.auction.highestBidderId) {
      const winner = this.players.get(this.auction.highestBidderId);
      if (winner && winner.cash >= this.auction.currentBid) {
        winner.cash -= this.auction.currentBid;
        winner.score += Math.floor(this.currentInvention.baseValue * 0.5);
        winner.inventory.push(this.currentInvention.title);
      }
    }

    io.to(this.code).emit('round_reveal_data', roundResults);
    io.to(this.code).emit('game_state_update', this.getPublicState());

    this.runTimer(io, 15, () => {
      if (this.roundNumber >= this.maxRounds) {
        this.state = 'GAMEOVER';
        io.to(this.code).emit('game_state_update', this.getPublicState());
      } else {
        this.startNextRound(io);
      }
    });
  }

  runTimer(io, seconds, callback) {
    if (this.timer) clearInterval(this.timer);
    this.timeLeft = seconds;
    this.timer = setInterval(() => {
      this.timeLeft--;
      io.to(this.code).emit('timer_tick', { timeLeft: this.timeLeft });
      if (this.timeLeft <= 0) {
        clearInterval(this.timer);
        callback();
      }
    }, 1000);
  }

  resetGame() {
    if (this.timer) clearInterval(this.timer);
    this.state = 'LOBBY';
    this.roundNumber = 0;
    this.pitches.clear();
    this.votes.clear();
    this.players.forEach(p => {
      p.score = 0;
      p.cash = 10000;
      p.isImposter = false;
      p.inventory = [];
    });
  }
}

// --- SOCKET.IO EVENT HANDLERS ---
io.on('connection', (socket) => {
  let currentRoomCode = null;

  // 1. Create Room (Host)
  socket.on('create_room', ({ hostName, avatar }) => {
    const code = generateRoomCode();
    const room = new GameRoom(code, socket.id);
    rooms.set(code, room);
    currentRoomCode = code;

    socket.join(code);
    const hostPlayer = room.addPlayer(socket.id, hostName || 'Host', avatar || '👑', true);

    socket.emit('room_created', {
      roomCode: code,
      player: hostPlayer,
      state: room.getPublicState()
    });
  });

  // 2. Join Room (Player on mobile or PC)
  socket.on('join_room', ({ roomCode, playerName, avatar }) => {
    const cleanCode = (roomCode || '').toUpperCase().trim();
    const room = rooms.get(cleanCode);

    if (!room) {
      socket.emit('join_error', { message: 'Invalid Room Code. Please check and try again.' });
      return;
    }

    if (room.state !== 'LOBBY') {
      socket.emit('join_error', { message: 'Game already in progress. Please wait for next session.' });
      return;
    }

    currentRoomCode = cleanCode;
    socket.join(cleanCode);
    const player = room.addPlayer(socket.id, playerName, avatar, false);

    socket.emit('room_joined', {
      roomCode: cleanCode,
      player: player,
      state: room.getPublicState()
    });

    io.to(cleanCode).emit('player_joined', {
      player: player,
      state: room.getPublicState()
    });
  });

  // 3. Add AI Bot (Great for testing or filling rooms)
  socket.on('add_bot', () => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room || room.hostId !== socket.id || room.state !== 'LOBBY') return;

    const availableBots = AI_BOT_PROFILES.filter(b => 
      !Array.from(room.players.values()).some(p => p.name === b.name)
    );

    if (availableBots.length === 0) return;
    const botProfile = availableBots[Math.floor(Math.random() * availableBots.length)];
    const botId = `bot_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    
    const botPlayer = room.addPlayer(botId, botProfile.name, botProfile.avatar, false, true);
    io.to(currentRoomCode).emit('player_joined', {
      player: botPlayer,
      state: room.getPublicState()
    });
  });

  // 4. Start Game
  socket.on('start_game', () => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room || room.hostId !== socket.id) return;

    if (room.players.size < 2) {
      socket.emit('game_error', { message: 'Need at least 2 players to start! Add an AI Bot or invite a friend.' });
      return;
    }

    room.startNextRound(io);
  });

  // 5. Submit Pitch
  socket.on('submit_pitch', ({ pitchText }) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room || room.state !== 'PITCH') return;

    const cleanText = (pitchText || '').trim().slice(0, 160);
    if (!cleanText) return;

    room.pitches.set(socket.id, {
      pitchText: cleanText,
      submittedAt: Date.now()
    });

    io.to(currentRoomCode).emit('pitch_submitted', {
      playerId: socket.id,
      state: room.getPublicState()
    });

    // If all human players submitted, accelerate to showcase
    const totalPitches = room.pitches.size;
    if (totalPitches >= room.players.size) {
      if (room.timer) clearInterval(room.timer);
      room.startShowcasePhase(io);
    }
  });

  // 6. Live Reaction Emojis
  socket.on('send_reaction', ({ emoji }) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;
    const player = room.players.get(socket.id);
    
    io.to(currentRoomCode).emit('floating_reaction', {
      emoji: emoji || '🔥',
      senderName: player ? player.name : 'Audience',
      id: Math.random()
    });
  });

  // 7. Submit Vote
  socket.on('submit_vote', ({ targetPlayerId }) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room || room.state !== 'VOTING') return;

    room.votes.set(socket.id, targetPlayerId);
    io.to(currentRoomCode).emit('vote_recorded', {
      voterId: socket.id,
      state: room.getPublicState()
    });

    if (room.votes.size >= room.players.size) {
      if (room.timer) clearInterval(room.timer);
      room.startAuctionPhase(io);
    }
  });

  // 8. Place Bid
  socket.on('place_bid', ({ increment }) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room || room.state !== 'AUCTION') return;

    const amount = Number(increment) || 500;
    room.handleBid(socket.id, amount, io);
  });

  // 9. Pass Bid
  socket.on('pass_bid', () => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room || room.state !== 'AUCTION') return;

    room.auction.passedPlayers.add(socket.id);
    io.to(currentRoomCode).emit('player_passed', {
      playerId: socket.id,
      state: room.getPublicState()
    });
  });

  // 10. Play Again / Restart
  socket.on('restart_game', () => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room || room.hostId !== socket.id) return;

    room.resetGame();
    io.to(currentRoomCode).emit('game_restarted', room.getPublicState());
  });

  // Disconnect
  socket.on('disconnect', () => {
    if (currentRoomCode) {
      const room = rooms.get(currentRoomCode);
      if (room) {
        room.removePlayer(socket.id);
        if (room.players.size === 0) {
          if (room.timer) clearInterval(room.timer);
          rooms.delete(currentRoomCode);
        } else {
          io.to(currentRoomCode).emit('player_left', {
            playerId: socket.id,
            state: room.getPublicState()
          });
        }
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Jugaad Heist server running on port http://localhost:${PORT}`);
});
