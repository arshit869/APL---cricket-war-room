import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { matchScript } from './mockData.js';
import { generateBets, generateRoast } from './agents.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' }
});

app.use(cors());
app.use(express.json());

// IN-MEMORY STATE
let state = {
  status: 'waiting',
  currentBallIndex: 0,
  users: {},
  activeBets: [],
  userBets: {},
  leaderboard: [],
  feed: [],
  agentActivity: [],
  // Live score tracking
  score: 0,
  wickets: 0,
  over: 0,
  ball: 0,
};

function logAgent(agentName, action, color) {
  const log = { agent: agentName, action, color, time: Date.now() };
  state.agentActivity.unshift(log);
  if (state.agentActivity.length > 10) state.agentActivity.pop();
  io.emit('agent:activity', log);
}

// ─── Agent 1: Match Simulator ─────────────────────────────────────────────────
let simulatorTimeout;

async function scheduleNextBall() {
  if (state.currentBallIndex >= matchScript.length) {
    state.status = 'ended';
    logAgent('Agent 5: Oracle Tracker', 'Match Ended. Calculating Oracle.', 'purple');
    io.emit('match:end', { message: 'Match has ended!' });
    return;
  }
  const delay = 8000 + Math.random() * 4000; // 8-12s per ball
  simulatorTimeout = setTimeout(async () => {
    await processNextBall();
    scheduleNextBall();
  }, delay);
}

async function processNextBall() {
  const raw = matchScript[state.currentBallIndex];
  state.currentBallIndex++;

  // Update live score state
  state.score = raw.score ?? state.score + (raw.runs || 0);
  state.wickets = raw.wickets ?? (state.wickets + (raw.isWicket ? 1 : 0));
  state.over = raw.over ?? state.over;
  state.ball = raw.ball ?? state.ball;

  const event = {
    ...raw,
    score: state.score,
    wickets: state.wickets,
    over: state.over,
    ball: state.ball,
  };

  state.feed.unshift(event);
  io.emit('match:event', event);
  logAgent('Agent 1: Match Simulator', `Ball ${event.over}.${event.ball} — ${event.type} by ${event.player}`, 'blue');

  // Agent 4: Roast on Wicket or Six
  if (event.isWicket || event.type === 'six') {
    logAgent('Agent 4: Roast Agent', `Calling Claude for ${event.type}`, 'red');
    const roastText = await generateRoast(event, {
      score: event.score,
      wickets: event.wickets,
      over: event.over
    });
    io.emit('roast:generated', { event, roastText });
  }

  // Agent 3: Settlement + Agent 2: New Bets — at end of each over
  if (event.ball === 6 || event.ball === 'W') {
    const isEndOfOver = event.ball === 6;
    if (isEndOfOver) {
      logAgent('Agent 3: Settlement', `Resolving bets for over ${event.over}`, 'green');
      const overEvents = state.feed.filter(e => e.over === event.over);
      const overRuns = overEvents.reduce((sum, e) => sum + (e.runs || 0), 0);
      const overWickets = overEvents.filter(e => e.isWicket).length;

      Object.keys(state.userBets).forEach(userId => {
        const user = state.users[userId];
        if (!user) return;
        const bets = state.userBets[userId];
        bets.forEach(bet => {
          let won = false;
          if (bet.type === 'runs' && overRuns >= bet.threshold) won = true;
          if (bet.type === 'wicket' && overWickets >= bet.threshold) won = true;
          if (bet.type === 'singles' && overEvents.filter(e => e.type === 'single').length >= bet.threshold) won = true;

          user.accuracy.total++;
          if (won) {
            user.coins += bet.reward;
            user.accuracy.correct++;
            logAgent('Agent 3: Settlement', `${user.name} won ${bet.reward} coins!`, 'green');
          }
        });
      });

      state.userBets = {};
      io.emit('leaderboard:update', state.users);

      // Agent 2: Generate fresh bets for next over
      if (event.over < 20) {
        logAgent('Agent 2: Bet Generator', `Generating bets for over ${event.over + 1}`, 'amber');
        state.activeBets = generateBets(event.over + 1);
        io.emit('bets:new', state.activeBets);
        logAgent('Agent 2: Bet Generator', `${state.activeBets.length} bets ready`, 'amber');
      }
    }
  }
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// Join — if user with same id exists, restore them (for refresh recovery)
app.post('/api/join', (req, res) => {
  const { id, name, team, coins, isTraitor, accuracy } = req.body;

  // If id provided and user exists, restore (refresh recovery)
  if (id && state.users[id]) {
    res.json({ user: state.users[id] });
    return;
  }

  // If id provided but user lost (server restart) — restore with same id
  if (id) {
    state.users[id] = {
      id,
      name,
      team,
      coins: coins || 1000,
      isTraitor: isTraitor || false,
      accuracy: accuracy || { correct: 0, total: 0 }
    };
    io.emit('user:joined', state.users[id]);
    res.json({ user: state.users[id] });
    return;
  }

  // Fresh join
  const newId = Date.now().toString();
  const isTraitorNew = Math.random() < 0.1;
  state.users[newId] = {
    id: newId,
    name,
    team,
    coins: 1000,
    isTraitor: isTraitorNew,
    accuracy: { correct: 0, total: 0 }
  };
  io.emit('user:joined', state.users[newId]);
  res.json({ user: state.users[newId] });
});

app.post('/api/bet', (req, res) => {
  const { userId, betId } = req.body;
  if (!state.users[userId]) return res.status(404).json({ error: 'User not found' });
  
  const bet = state.activeBets.find(b => b.id === betId);
  if (!bet) return res.status(400).json({ error: 'Bet not active' });

  const user = state.users[userId];
  if (user.coins < bet.stake) return res.status(400).json({ error: 'Insufficient coins' });

  user.coins -= bet.stake;
  if (!state.userBets[userId]) state.userBets[userId] = [];
  state.userBets[userId].push({ ...bet });

  io.emit('user:update', user);
  logAgent('Agent 2: Bet Generator', `${user.name} placed ${bet.stake}🪙 on "${bet.question}"`, 'amber');

  io.emit('social:bet', {
    id: Date.now().toString(),
    user: user.name,
    team: user.team,
    stake: bet.stake,
    question: bet.question,
    time: Date.now()
  });

  res.json({ success: true, user });
});

app.post('/api/rant', (req, res) => {
  const { userId, text, type } = req.body;
  if (!state.users[userId]) return res.status(404).json({ error: 'User not found' });
  const user = state.users[userId];
  const rant = {
    id: Date.now().toString(),
    user: user.name,
    team: user.team,
    text,
    type,
    time: Date.now()
  };
  io.emit('social:rant', rant);
  res.json({ success: true });
});

app.get('/api/state', (req, res) => {
  res.json(state);
});

// ─── Boot ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, async () => {
  console.log(`Backend running on port ${PORT}`);
  console.log('Auto-starting Match Simulator...');
  state.status = 'live';

  // Generate bets immediately so users see them on join
  state.activeBets = generateBets(1);
  console.log(`Generated ${state.activeBets.length} initial bets`);

  // Start ball-by-ball simulation
  scheduleNextBall();
});
