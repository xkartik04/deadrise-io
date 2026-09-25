# 🎮 Jugaad Heist: The Master Imposter & Auction
### Built for the Handshake AI Skills Studio × OpenAI Multiplayer Game Challenge

![Jugaad Heist Cover](cover.jpg)

**Jugaad Heist** is a fast-paced, hilarious multiplayer party game that combines social bluffing, secret imposter deduction, absurd invention pitching, and high-stakes live auctions.

---

## 🌟 Highlights & Key Features

- **📱 Zero-Friction Multi-Device Play:** Host on a laptop, TV, or desktop screen. Friends scan a dynamic on-screen **QR code** with their phone camera to join in 3 seconds flat (no apps or downloads required).
- **🕵️ Secret Imposter Mechanic:** Authentic inventors receive the full invention blueprint; the secret **Chor (Imposter)** receives a corrupted blueprint with missing keywords and must bluff their way through their pitch!
- **📢 The Pitch Showcase:** Players deliver punchy 1-line taglines on their phones, showcased with live floating audience reaction emojis (`🔥`, `💀`, `💰`, `🚀`, `😂`, `🚨`, `👏`).
- **🔨 Live High-Stakes Auction:** Players use their virtual ₹10,000 / $10,000 cash stash to outbid each other in real-time with procedural Web Audio gavel smashes and sound effects.
- **🤖 Built-in AI Bots:** Host can click `+ Add AI Bot` (`ChaiBot-3000`, `SharmaJi_AI`, etc.) to play or test anytime, even when solo or with 1 friend.
- **🔊 100% Procedural Web Audio Synthesizer:** Zero external audio assets needed; all sound effects (gavels, coin clinks, timers, victory fanfares) are generated in real-time via the Web Audio API.

---

## 🚀 Quick Start (Run Locally)

1. Make sure you have **Node.js** installed.
2. Open terminal in the project directory:
   ```bash
   npm install
   node server.js
   ```
3. Open your browser at:
   ```
   http://localhost:3000
   ```
4. Click **"👑 Host New Game"** on your computer.
5. On another tab, phone, or laptop connected to the same network (or via ngrok/Render), scan the QR code or enter the 4-letter room code to join as Player 2!

---

## 🌐 Deploy to Free Cloud Hosting (1-Click)

To get a public link to share with friends and submit to the contest:

### Option A: Render (Free Web Service)
1. Push this folder to a GitHub repository.
2. Go to [render.com](https://render.com) -> New **Web Service**.
3. Set **Build Command**: `npm install`
4. Set **Start Command**: `node server.js`
5. Click **Deploy** to get your free `https://your-game.onrender.com` URL!

### Option B: Glitch (Instant Browser Edit & Run)
1. Go to [glitch.com](https://glitch.com).
2. Import repo or upload files.
3. Your live URL is ready instantly!

---

## 🏆 Official Contest Submission Metadata

- **Project Title:** `Jugaad Heist: The Master Imposter & Auction`
- **Cover Image:** `cover.jpg`
- **Short Description:**
  > A fast-paced real-time multiplayer party game where 2-8+ players pitch absurd inventions, unmask secret imposters, and battle in live high-stakes auctions from their phones and laptops.
- **Tech Stack:** Node.js, Express, Socket.IO, Web Audio API, HTML5 Canvas, Modern CSS Glassmorphism.
