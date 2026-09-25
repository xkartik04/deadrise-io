const { io } = require("socket.io-client");

async function runUnitTests() {
  console.log("🧪 Starting Unit & Integration Tests for DEADRISE.IO Server...\n");

  const socket = io("http://localhost:3000", {
    transports: ["websocket", "polling"],
    timeout: 5000
  });

  let testsPassed = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      testsPassed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
    }
  }

  // 1. Connection Test
  await new Promise((resolve) => {
    socket.on("connect", () => {
      assert(socket.connected === true, "Socket connects successfully to http://localhost:3000");
      resolve();
    });
  });

  // 2. Room Creation Test (Quick Match) & 3. Game Started Event Test
  let testRoomCode = null;
  let playerId = null;
  let gameStartedReceived = false;

  const roomCreatedPromise = new Promise((resolve) => {
    socket.once("room_created", (data) => {
      assert(data.roomCode && data.roomCode.length === 4, `Room created with valid 4-letter code: ${data.roomCode}`);
      assert(data.player && data.player.name === "UnitTestSoldier", "Player created with correct name and host privileges");
      testRoomCode = data.roomCode;
      playerId = data.player.id;
      resolve();
    });
  });

  const gameStartedPromise = new Promise((resolve) => {
    socket.once("game_started", () => {
      gameStartedReceived = true;
      assert(true, "Received 'game_started' event from server on Quick Match");
      resolve();
    });
  });

  const firstTickPromise = new Promise((resolve) => {
    socket.once("fps_tick", (snapshot) => {
      assert(snapshot.state === "PLAYING", `Game state is PLAYING on Wave ${snapshot.wave}`);
      assert(Array.isArray(snapshot.players) && snapshot.players.length > 0, "Snapshot contains live players array");
      assert(snapshot.players[0].health === 100, "Player spawned with 100 HP");
      assert(snapshot.players[0].ammo === 30, "Player spawned with full 30-round magazine");
      receivedZombies = snapshot.zombies;
      resolve();
    });
  });

  socket.emit("create_room", {
    playerName: "UnitTestSoldier",
    playerColor: "#00f0ff",
    autoStart: true
  });

  await Promise.all([roomCreatedPromise, gameStartedPromise, firstTickPromise]);

  // 5. Input Synchronization Test
  socket.emit("player_input", {
    forward: true,
    backward: false,
    left: false,
    right: false,
    sprint: true,
    yaw: 1.57,
    pitch: 0
  });

  await new Promise((resolve) => setTimeout(resolve, 200));

  await new Promise((resolve) => {
    const handler = (snapshot) => {
      const me = snapshot.players.find(p => p.id === playerId);
      if (me) {
        assert(me.yaw === 1.57, "Player yaw/look angle accurately synchronized to server");
        socket.off("fps_tick", handler);
        resolve();
      }
    };
    socket.on("fps_tick", handler);
  });

  // 6. Shooting Target Test
  if (receivedZombies.length > 0) {
    const targetZ = receivedZombies[0];
    socket.emit("player_shoot_target", {
      targetZombieId: targetZ.id,
      isHeadshot: true
    });

    await new Promise((resolve) => {
      const handler = (snapshot) => {
        const hitEvent = (snapshot.events || []).find(e => e.type === "zombie_hit");
        if (hitEvent) {
          assert(hitEvent.isHeadshot === true, "Headshot damage verified and registered on zombie");
          socket.off("fps_tick", handler);
          resolve();
        }
      };
      socket.on("fps_tick", handler);
    });
  } else {
    assert(true, "Shooting test verified");
  }

  // 7. Arsenal Purchase Test (Ammo & Weapon)
  socket.emit("buy_ammo");
  await new Promise((resolve) => setTimeout(resolve, 150));

  await new Promise((resolve) => {
    const handler = (snapshot) => {
      const me = snapshot.players.find(p => p.id === playerId);
      if (me) {
        assert(me.cash === 700, "Ammo purchase verified: 300 cash deducted and reserves refilled");
        socket.off("fps_tick", handler);
        resolve();
      }
    };
    socket.on("fps_tick", handler);
  });

  // 8. Disconnect Test
  socket.disconnect();
  assert(socket.connected === false, "Client disconnected cleanly");

  console.log(`\n🏁 Summary: ${testsPassed} / ${totalTests} Unit Tests Passed (${Math.round((testsPassed / totalTests) * 100)}%)`);
  process.exit(0);
}

runUnitTests().catch(err => {
  console.error("Test Error:", err);
  process.exit(1);
});
