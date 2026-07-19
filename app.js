// ====== RIDDLE DATA ======
// Edit these to your own riddles. Answers compared case-insensitively.
const RIDDLES = [
  { q: "At the point on the map, Where some would call alpha, Where the pictures are best, Right next to some agua", a: ["4_D4_GR4M"], hint: "Think about the northern most point of the camp." },
  { q: "paxkx max uteexkl fxxm. Shift 7", a: ["1ST_TRY"], hint: "replace each letter with the one 7 places after ex. a->h, b->i, c->j, ..." },
  { q: "A body of water, Where jumping is seen, Not the lake or the park, But somewhere in between.", a: ["G00_L4G00N"], hint: "Where you might go blobbing" },
  { q: "4, 9, 14, 9, 14, 7, 8, 1, 12, 12", a: ["YUMMY"], hint: "a->1, b->2, c->3, ..." },
  { q: "where you won't find the sea, where you definitely Can see, a fall some forsee, a plaCed marked with ____.", a: ["C4T3RP1LL4R"], hint: "Location marked by the capitalized letters." },
  { q: "Where you might find a boat, To explore carolina, Where You hear people scream, At the end of a line (uh).", a: ["L4BYR1NTH"], hint: "Baybe the end of a zipline (uh)." },
  { q: "I gave a second chance to QP, But now im left here where the cars be.", a: ["50/50"], hint: "Oh the parking lot right next to point Q (cliff jump), Cupid is so dumb." },
  { q: "Backpack, Bigback, Southern most ____", a: ["4N1M4T0R"], hint: "Look next to the zipline tower." }
];

const NUM_RIDDLES = RIDDLES.length; // 8
const MAX_TEAMS = 32;

// Each array lists riddle NUMBERS (1-8) in the order that team should solve them.
const TEAM_ORDERS = {
    1:[1,6,4,5,7,3,2,0],
    2:[1,5,3,2,4,7,6,0],
    3:[2,7,5,6,0,4,3,1],
    4:[2,6,4,3,5,0,7,1],
    5:[3,0,6,7,1,5,4,2],
    6:[3,7,5,4,6,1,0,2],
    7:[4,1,7,0,2,6,5,3],
    8:[4,0,6,5,7,2,1,3],
    9:[5,2,0,1,3,7,6,4],
    10:[5,1,7,6,0,3,2,4],
    11:[6,3,1,2,4,0,7,5],
    12:[6,2,0,7,1,4,3,5],
    13:[7,4,2,3,5,1,0,6],
    14:[7,3,1,0,2,5,4,6],
    15:[0,5,3,4,6,2,1,7],
    16:[0,4,2,1,3,6,5,7],
    17:[7,3,2,0,1,6,4,5],
    18:[4,7,6,0,1,5,3,2],
    19:[0,4,3,1,2,7,5,6],
    20:[5,0,7,1,2,6,4,3],
    21:[1,5,4,2,3,0,6,7],
    22:[6,1,0,2,3,7,5,4],
    23:[2,6,5,3,4,1,7,0],
    24:[7,2,1,3,4,0,6,5],
    25:[3,7,6,4,5,2,0,1],
    26:[0,3,2,4,5,1,7,6],
    27:[4,0,7,5,6,3,1,2],
    28:[1,4,3,5,6,2,0,7],
    29:[5,1,0,6,7,4,2,3],
    30:[2,5,4,6,7,3,1,0],
    31:[6,2,1,7,0,5,3,4],
    32:[3,6,5,7,0,4,2,1]
};

// ====== ORDERING ALGORITHM ======
// Latin-square style rotation guarantees even distribution:
// At every step index s, the set of {teams' current riddles} is spread across
// all 8 riddles evenly (each riddle held by MAX_TEAMS/NUM_RIDDLES = 4 teams).
// Team t (0-indexed) at step s gets riddle (start + s*stride) % NUM_RIDDLES.

// Dev-only sanity check. Call validateTeamOrders() from the console.
// function validateTeamOrders() {
//   const problems = [];
//   for (let team = 1; team <= MAX_TEAMS; team++) {
//     const seq = TEAM_ORDERS[team];
//     if (!seq) { problems.push(`Team ${team}: MISSING sequence`); continue; }
//     if (seq.length !== NUM_RIDDLES) {
//       problems.push(`Team ${team}: has ${seq.length} riddles, expected ${NUM_RIDDLES}`);
//     }
//     // Adjust the expected set depending on Option A (1-8) or Option B (0-7):
//     const expected = new Set();
//     for (let i = 0; i < NUM_RIDDLES; i++) expected.add(i); // Option A (1-based)
//     // for Option B use: for (let i = 0; i < NUM_RIDDLES; i++) expected.add(i);
//     const seen = new Set(seq);
//     if (seen.size !== seq.length) {
//       problems.push(`Team ${team}: contains DUPLICATE riddles`);
//     }
//     for (const val of seq) {
//       if (!expected.has(val)) {
//         problems.push(`Team ${team}: invalid riddle value ${val}`);
//       }
//     }
//   }

//   if (problems.length === 0) {
//     console.log('%c✓ All 32 team sequences are valid.', 'color: #34d399; font-weight: bold;');
//   } else {
//     console.warn('Team order problems found:\n' + problems.join('\n'));
//   }
//   return problems;
// }

// // Reports how many teams are on each riddle at each step.
// function checkDistribution() {
//   for (let step = 0; step < NUM_RIDDLES; step++) {
//     const counts = {};
//     for (let team = 1; team <= MAX_TEAMS; team++) {
//       const seq = TEAM_ORDERS[team];
//       const riddle = seq[step];
//       counts[riddle] = (counts[riddle] || 0) + 1;
//     }
//     console.log(`Step ${step + 1}:`, counts);
//   }
// }

function getOrdering(teamNumber) {
  const seq = TEAM_ORDERS[teamNumber];
  if (!seq) {
    throw new Error(`No sequence defined for team ${teamNumber}`);
  }
  return seq.slice(); // already 0-based, return a copy
}

// ====== STATE ======
let state = {
  team: null,
  order: [],
  currentStep: 0,
  hintsUsed: [],   // boolean per original riddle id
  timestamps: []   // completion timestamp per step
};

// ====== SCREEN HELPERS ======
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// Returns seconds since local midnight (0–86399). Compact and sortable.
function getLocalTimestamp() {
  try {
    const d = new Date();
    return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
  } catch (e) {
    return -1; // -1 signals "unavailable"
  }
}

// ====== GAME FLOW ======
function startGame() {
  const val = parseInt(document.getElementById('teamInput').value, 10);
  const err = document.getElementById('teamError');
  if (isNaN(val) || val < 1 || val > MAX_TEAMS) {
    err.textContent = `Please enter a valid team number (1–${MAX_TEAMS}).`;
    return;
  }
  err.textContent = '';
  state.team = val;
  state.order = getOrdering(val);
  state.currentStep = 0;
  state.hintsUsed = new Array(NUM_RIDDLES).fill(false);
  state.timestamps = new Array(NUM_RIDDLES).fill(null);
  saveState();
  showScreen('screen-riddle');
  renderRiddle();
}

function renderRiddle() {
  const riddleId = state.order[state.currentStep];
  const riddle = RIDDLES[riddleId];

  document.getElementById('progressTeam').textContent = `Team ${state.team}`;
  document.getElementById('progressStep').textContent =
    `Riddle ${state.currentStep + 1} of ${NUM_RIDDLES}`;
  document.getElementById('progressFill').style.width =
    `${(state.currentStep / NUM_RIDDLES) * 100}%`;
  document.getElementById('riddleTitle').textContent = `Riddle ${state.currentStep + 1}`;
  document.getElementById('riddleText').textContent = riddle.q;

  const hintBox = document.getElementById('hintBox');
  const hintBtn = document.getElementById('hintBtn');
  if (state.hintsUsed[riddleId]) {
    hintBox.style.display = 'block';
    document.getElementById('hintText').textContent = riddle.hint;
    hintBtn.style.display = 'none';
  } else {
    hintBox.style.display = 'none';
    hintBtn.style.display = 'block';
  }

  document.getElementById('guessInput').value = '';
  document.getElementById('guessError').textContent = '';
  document.getElementById('guessInput').focus();
}

function revealHint() {
  const riddleId = state.order[state.currentStep];
  state.hintsUsed[riddleId] = true;
  saveState();
  renderRiddle();
}

function normalize(str) {
  return str.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function submitGuess() {
  const riddleId = state.order[state.currentStep];
  const riddle = RIDDLES[riddleId];
  const guess = normalize(document.getElementById('guessInput').value);
  const err = document.getElementById('guessError');

  if (!guess) {
    err.textContent = 'Please enter an answer.';
    return;
  }

  const correct = riddle.a.some(ans => normalize(ans) === guess);
  if (correct) {
    state.timestamps[state.currentStep] = getLocalTimestamp();
    state.currentStep++;
    saveState();
    if (state.currentStep >= NUM_RIDDLES) {
      finishGame();
    } else {
      renderRiddle();
    }
  } else {
    err.textContent = 'Not quite — try again!';
    document.getElementById('guessInput').select();
  }
}

// ====== WIN / QR CODE ======
function finishGame() {
  showScreen('screen-win');
  document.getElementById('winTeam').textContent =
    `Team ${state.team}, you've solved all ${NUM_RIDDLES} riddles.`;

  // Compact positional encoding — NO labels.
  // Format:  team|r,h,t;r,h,t;...  (one segment per completed step, in solve order)
  //   r = riddle number (1-based)
  //   h = hint used (1) or not (0)
  //   t = seconds since midnight at completion (-1 if unavailable)
  const segments = state.order.map((riddleId, step) => {
    const r = riddleId + 1;
    const h = state.hintsUsed[riddleId] ? 1 : 0;
    const t = state.timestamps[step];
    return `${r},${h},${t}`;
  });

  const encoded = `${state.team}|${segments.join(';')}`;
  // Example: "7|3,0,52327;7,1,52410;1,0,52498;..."

  // Render QR
  const qrContainer = document.getElementById('qrcode');
  qrContainer.innerHTML = '';
  new QRCode(qrContainer, {
    text: encoded,
    width: 240,
    height: 240,
    correctLevel: QRCode.CorrectLevel.M
  });

  // Human-readable summary
  const hintsCount = state.hintsUsed.filter(Boolean).length;
  document.getElementById('summary').innerHTML =
    `<span class="badge">Team <strong>${state.team}</strong></span>` +
    `<span class="badge">Hints Used <strong>${hintsCount}</strong></span>`;

  clearState();
}

// ====== PERSISTENCE (survive accidental refresh, still offline) ======
function saveState() {
  try {
    localStorage.setItem('treasureHuntState', JSON.stringify(state));
  } catch (e) {}
}

function clearState() {
  try {
    localStorage.removeItem('treasureHuntState');
  } catch (e) {}
}

function loadState() {
  try {
    const saved = localStorage.getItem('treasureHuntState');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.team && parsed.currentStep < NUM_RIDDLES) {
        state = parsed;
        showScreen('screen-riddle');
        renderRiddle();
      }
    }
  } catch (e) {}
}

// Allow pressing Enter to submit
document.addEventListener('keydown', (e) => {
  const modalOpen = document.getElementById('resetModal').classList.contains('active');
  if (modalOpen) return; // don't submit while confirming reset

  if (e.key === 'Enter') {
    if (document.getElementById('screen-team').classList.contains('active')) {
      startGame();
    } else if (document.getElementById('screen-riddle').classList.contains('active')) {
      submitGuess();
    }
  }
});

// ====== RESET ======
function openResetModal() {
  document.getElementById('resetModal').classList.add('active');
}

function closeResetModal() {
  document.getElementById('resetModal').classList.remove('active');
}

function confirmReset() {
  clearState();               // remove saved progress from localStorage
  state = {                   // reset in-memory state
    team: null,
    order: [],
    currentStep: 0,
    hintsUsed: [],
    timestamps: []
  };
  closeResetModal();
  document.getElementById('teamInput').value = '';
  document.getElementById('teamError').textContent = '';
  showScreen('screen-team');
}

// Close modal on backdrop click
document.getElementById('resetModal').addEventListener('click', (e) => {
  if (e.target.id === 'resetModal') closeResetModal();
});

// Close modal on Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeResetModal();
});

// Resume in-progress game on load
window.addEventListener('load', loadState);