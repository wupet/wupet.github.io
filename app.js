/************************************************************
 * TREASURE HUNT APP
 *
 * Edit the STATIONS array below.
 *
 * Each station needs:
 * - id: unique identifier
 * - riddle: what the team sees
 * - code: the answer/code they must enter to unlock next clue
 ************************************************************/

const STATIONS = [
  {
    id: "tree",
    riddle: "I stand tall with arms but never wave. Find me where shade is saved.",
    code: "TREE42"
  },
  {
    id: "bench",
    riddle: "I am not tired, but people rest on me. Look where sitters like to be.",
    code: "BENCH18"
  },
  {
    id: "flag",
    riddle: "I dance in the wind but have no feet. Find the colors flying high.",
    code: "FLAG7"
  },
  {
    id: "door",
    riddle: "I open and close but never walk away. Find the entrance to continue your day.",
    code: "DOOR99"
  },
  {
    id: "garden",
    riddle: "I am full of colors, roots, and bees. Find the place with flowers and leaves.",
    code: "BLOOM5"
  },
  {
    id: "field",
    riddle: "Wide and open, green and bright. Find the place for games and flight.",
    code: "FIELD3"
  }
];


/************************************************************
 * App State
 ************************************************************/

let teamNumber = null;
let stationOrder = [];
let currentIndex = 0;


/************************************************************
 * Elements
 ************************************************************/

const startScreen = document.getElementById("startScreen");
const huntScreen = document.getElementById("huntScreen");
const finishedScreen = document.getElementById("finishedScreen");

const teamInput = document.getElementById("teamInput");
const startButton = document.getElementById("startButton");

const teamDisplay = document.getElementById("teamDisplay");
const currentStep = document.getElementById("currentStep");
const totalSteps = document.getElementById("totalSteps");
const riddleText = document.getElementById("riddleText");
const codeInput = document.getElementById("codeInput");
const submitCodeButton = document.getElementById("submitCodeButton");
const feedbackMessage = document.getElementById("feedbackMessage");

const resetButton = document.getElementById("resetButton");
const playAgainButton = document.getElementById("playAgainButton");
const finishedTeamNumber = document.getElementById("finishedTeamNumber");


/************************************************************
 * Screen Helpers
 ************************************************************/

function showScreen(screen) {
  startScreen.classList.remove("active");
  huntScreen.classList.remove("active");
  finishedScreen.classList.remove("active");

  screen.classList.add("active");
}


/************************************************************
 * Start Game
 ************************************************************/

function startGame() {
  const value = teamInput.value.trim();

  if (!value) {
    alert("Please enter a team number.");
    return;
  }

  teamNumber = Number(value);

  if (!Number.isInteger(teamNumber) || teamNumber <= 0) {
    alert("Please enter a valid team number.");
    return;
  }

  stationOrder = generateStationOrder(teamNumber, STATIONS);
  currentIndex = 0;

  saveProgress();
  renderCurrentClue();

  showScreen(huntScreen);
}


/************************************************************
 * Render Current Clue
 ************************************************************/

function renderCurrentClue() {
  const currentStation = stationOrder[currentIndex];

  if (!currentStation) {
    finishGame();
    return;
  }

  teamDisplay.textContent = teamNumber;
  currentStep.textContent = currentIndex + 1;
  totalSteps.textContent = stationOrder.length;
  riddleText.textContent = currentStation.riddle;

  codeInput.value = "";
  feedbackMessage.textContent = "";
  feedbackMessage.className = "feedback";

  setTimeout(() => {
    codeInput.focus();
  }, 100);
}


/************************************************************
 * Submit Code
 ************************************************************/

function submitCode() {
  const currentStation = stationOrder[currentIndex];

  if (!currentStation) return;

  const enteredCode = normalizeCode(codeInput.value);
  const correctCode = normalizeCode(currentStation.code);

  if (enteredCode === correctCode) {
    feedbackMessage.textContent = "Correct! Loading next clue...";
    feedbackMessage.className = "feedback good";

    currentIndex++;
    saveProgress();

    setTimeout(() => {
      if (currentIndex >= stationOrder.length) {
        finishGame();
      } else {
        renderCurrentClue();
      }
    }, 700);
  } else {
    feedbackMessage.textContent = "Not quite. Try again.";
    feedbackMessage.className = "feedback bad";
    codeInput.select();
  }
}


/************************************************************
 * Finish Game
 ************************************************************/

function finishGame() {
  finishedTeamNumber.textContent = teamNumber;
  showScreen(finishedScreen);
}


/************************************************************
 * Reset
 ************************************************************/

function resetGame() {
  const confirmed = confirm("Reset this team's progress?");

  if (!confirmed) return;

  localStorage.removeItem("treasureHuntState");

  teamNumber = null;
  stationOrder = [];
  currentIndex = 0;

  teamInput.value = "";
  showScreen(startScreen);
}


/************************************************************
 * Save / Load
 ************************************************************/

function saveProgress() {
  const state = {
    teamNumber,
    currentIndex
  };

  localStorage.setItem("treasureHuntState", JSON.stringify(state));
}

function loadProgress() {
  const saved = localStorage.getItem("treasureHuntState");

  if (!saved) {
    showScreen(startScreen);
    return;
  }

  try {
    const state = JSON.parse(saved);

    teamNumber = state.teamNumber;
    currentIndex = state.currentIndex || 0;
    stationOrder = generateStationOrder(teamNumber, STATIONS);

    if (currentIndex >= stationOrder.length) {
      finishGame();
    } else {
      renderCurrentClue();
      showScreen(huntScreen);
    }
  } catch {
    showScreen(startScreen);
  }
}


/************************************************************
 * Code Normalizing
 *
 * This makes codes easier to enter.
 * For example:
 * "Tree 42", "tree42", and "TREE42" all match.
 ************************************************************/

function normalizeCode(code) {
  return String(code)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}


/************************************************************
 * Generate Unique Station Order
 *
 * This uses the team number as a seed.
 * The same team number always gets the same order.
 * Different team numbers usually get different orders.
 ************************************************************/

function generateStationOrder(seed, stations) {
  const shuffled = [...stations];

  const random = seededRandom(seed);

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));

    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}


/************************************************************
 * Seeded Random Number Generator
 *
 * This makes randomness predictable based on team number.
 ************************************************************/

function seededRandom(seed) {
  let value = seed * 9301 + 49297;

  return function () {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}


/************************************************************
 * Events
 ************************************************************/

startButton.addEventListener("click", startGame);

teamInput.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    startGame();
  }
});

submitCodeButton.addEventListener("click", submitCode);

codeInput.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    submitCode();
  }
});

resetButton.addEventListener("click", resetGame);
playAgainButton.addEventListener("click", resetGame);


/************************************************************
 * Init
 ************************************************************/

loadProgress();