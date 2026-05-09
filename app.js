// Game State
let board = ['', '', '', '', '', '', '', '', ''];
let currentPlayer = 'X';
let gameActive = false;
let gameMode = 'vs-local';
let difficulty = 'easy';
let currentTheme = 'candy';
let scores = { X: 0, O: 0 };
let soundEnabled = true;
let playerNames = { X: 'Player 1', O: 'Player 2' };
let selectedSymbols = { x: 'X', o: 'O' };
let aiMoveTimer = null;
let gameOverTimer = null;

const THEME_SYMBOL_SETS = {
    candy: ['🧸', '🐰', '🐼', '🐱'],
    ocean: ['🐚', '⭐', '🪸', '⚪'],
    neon: ['✕', '◯', '△', '⬡'],
    nature: ['🍃', '🌸', '🍄', '🌲']
};

const WIN_CONDITIONS = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
];

const screens = {
    splash: document.getElementById('screen-splash'),
    theme: document.getElementById('screen-theme'),
    setup: document.getElementById('screen-setup'),
    difficulty: document.getElementById('screen-difficulty'),
    game: document.getElementById('screen-game')
};

const cells = document.querySelectorAll('.cell');
const turnIndicator = document.getElementById('turn-indicator');
const scoreX = document.getElementById('score-x');
const scoreO = document.getElementById('score-o');
const scoreLabelX = document.getElementById('score-label-x');
const scoreLabelO = document.getElementById('score-label-o');
const modalWinner = document.getElementById('modal-winner');
const winnerText = document.getElementById('winner-text');
const winnerAnimation = document.getElementById('winner-animation');
const body = document.body;
const boardElement = document.getElementById('board');

const inputPlayer1 = document.getElementById('input-player-1');
const inputPlayer2 = document.getElementById('input-player-2');
const labelPlayer2 = document.getElementById('label-player-2');
const symbolsPlayer1 = document.getElementById('symbols-player-1');
const symbolsPlayer2 = document.getElementById('symbols-player-2');
const symbolPlayer2Wrap = document.getElementById('symbol-player-2-wrap');
const symbolTitle1 = document.getElementById('symbol-title-1');
const symbolTitle2 = document.getElementById('symbol-title-2');

let audioCtx;
function initAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function playSound(type) {
    if (!soundEnabled) return;
    initAudio();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    if (type === 'click') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
    } else if (type === 'win') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400, audioCtx.currentTime);
        osc.frequency.setValueAtTime(600, audioCtx.currentTime + 0.1);
        osc.frequency.setValueAtTime(800, audioCtx.currentTime + 0.2);
        osc.frequency.setValueAtTime(1200, audioCtx.currentTime + 0.3);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.5);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
    } else {
        osc.type = 'square';
        osc.frequency.setValueAtTime(300, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.3);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
    }
}

function clearTimers() {
    if (aiMoveTimer) { clearTimeout(aiMoveTimer); aiMoveTimer = null; }
    if (gameOverTimer) { clearTimeout(gameOverTimer); gameOverTimer = null; }
}

function getThemeSymbols(themeName) {
    return THEME_SYMBOL_SETS[themeName] || ['X', 'O', '△', '⬡'];
}

function updateSymbolSelectionsUI() {
    symbolsPlayer1.querySelectorAll('.symbol-btn').forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.symbol === selectedSymbols.x);
        btn.classList.toggle('disabled', btn.dataset.symbol === selectedSymbols.o);
    });
    symbolsPlayer2.querySelectorAll('.symbol-btn').forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.symbol === selectedSymbols.o);
        btn.classList.toggle('disabled', btn.dataset.symbol === selectedSymbols.x);
    });
}

function renderSymbolButtons() {
    const options = getThemeSymbols(currentTheme);
    symbolsPlayer1.innerHTML = '';
    symbolsPlayer2.innerHTML = '';
    options.forEach(symbol => {
        const a = document.createElement('button');
        a.className = 'symbol-btn';
        a.type = 'button';
        a.dataset.symbol = symbol;
        a.innerText = symbol;
        symbolsPlayer1.appendChild(a);
        const b = document.createElement('button');
        b.className = 'symbol-btn';
        b.type = 'button';
        b.dataset.symbol = symbol;
        b.innerText = symbol;
        symbolsPlayer2.appendChild(b);
    });
    if (!options.includes(selectedSymbols.x)) selectedSymbols.x = options[0];
    if (!options.includes(selectedSymbols.o) || selectedSymbols.o === selectedSymbols.x) {
        selectedSymbols.o = options.find(symbol => symbol !== selectedSymbols.x) || options[1];
    }
    updateSymbolSelectionsUI();
}

function setupScreenForMode() {
    inputPlayer1.value = playerNames.X === 'Player 1' ? '' : playerNames.X;
    if (gameMode === 'vs-cpu') {
        labelPlayer2.innerText = 'Computer Name';
        inputPlayer2.value = 'Computer';
        inputPlayer2.disabled = true;
        symbolPlayer2Wrap.style.display = 'none';
        playerNames.O = 'Computer';
        symbolTitle1.innerText = 'Your Symbol';
    } else {
        labelPlayer2.innerText = 'Player 2 Name';
        inputPlayer2.value = playerNames.O === 'Player 2' || playerNames.O === 'Computer' ? '' : playerNames.O;
        inputPlayer2.disabled = false;
        symbolPlayer2Wrap.style.display = 'block';
        symbolTitle1.innerText = 'Player 1 Symbol';
        symbolTitle2.innerText = 'Player 2 Symbol';
    }
    renderSymbolButtons();
}

function showScreen(screenName) {
    playSound('click');
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[screenName].classList.add('active');
}

function setTheme(themeName) {
    // Remove old theme classes before applying new theme
    body.classList.remove('candy', 'ocean', 'neon', 'nature');
    body.classList.add(themeName);
    
    currentTheme = themeName;
    body.setAttribute('data-theme', themeName);
    const options = getThemeSymbols(currentTheme);
    selectedSymbols.x = options[0];
    selectedSymbols.o = options[1];
    updateBoardSymbols();
}

function resetGameState() {
    clearTimers();
    board = ['', '', '', '', '', '', '', '', ''];
    currentPlayer = 'X';
    gameActive = false; // Prevent interactions until explicitly started
    
    cells.forEach(cell => {
        cell.innerText = '';
        cell.className = 'cell'; // Completely wipe old classes
    });
    
    boardElement.style.pointerEvents = 'auto'; // Re-enable click events globally
    modalWinner.classList.remove('active'); // Reset overlays
}

function startGame() {
    resetGameState();
    gameActive = true;
    updateTurnIndicator();
}

function updateTurnIndicator() {
    const symbol = currentPlayer === 'X' ? selectedSymbols.x : selectedSymbols.o;
    turnIndicator.innerText = `${playerNames[currentPlayer]} (${symbol}) Turn`;
}

function updateBoardSymbols() {
    cells.forEach((cell, index) => {
        if (board[index] === 'X') cell.innerText = selectedSymbols.x;
        if (board[index] === 'O') cell.innerText = selectedSymbols.o;
    });
    scoreLabelX.innerText = selectedSymbols.x;
    scoreLabelO.innerText = selectedSymbols.o;
    if (gameActive) updateTurnIndicator();
}

function updateScores() {
    scoreX.innerText = scores.X;
    scoreO.innerText = scores.O;
}

function handleGameOver(winner) {
    boardElement.style.pointerEvents = 'none';
    clearTimers();
    gameOverTimer = setTimeout(() => {
        if (winner === 'Draw') {
            winnerText.innerText = "It's a Draw!";
            winnerAnimation.innerText = "🤝";
            playSound('draw');
        } else {
            scores[winner]++;
            updateScores();
            const symbol = winner === 'X' ? selectedSymbols.x : selectedSymbols.o;
            winnerText.innerText = `${playerNames[winner]} (${symbol}) Wins!`;
            winnerAnimation.innerText = "🎉";
            playSound('win');
        }
        modalWinner.classList.add('active');
    }, 600);
}

function checkWin() {
    let roundWon = false;
    let winningCells = [];
    for (let i = 0; i < WIN_CONDITIONS.length; i++) {
        const [a, b, c] = WIN_CONDITIONS[i];
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            roundWon = true;
            winningCells = [a, b, c];
            break;
        }
    }
    if (roundWon) {
        gameActive = false;
        winningCells.forEach(index => cells[index].classList.add('win'));
        handleGameOver(currentPlayer);
        return;
    }
    if (!board.includes('')) {
        gameActive = false;
        handleGameOver('Draw');
    }
}

function makeMove(index, player) {
    board[index] = player;
    const cell = cells[index];
    cell.innerText = player === 'X' ? selectedSymbols.x : selectedSymbols.o;
    cell.classList.add(player.toLowerCase(), 'filled');
    playSound('click');
    checkWin();
    if (gameActive) {
        currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
        updateTurnIndicator();
        boardElement.style.pointerEvents = (gameMode === 'vs-cpu' && currentPlayer === 'O') ? 'none' : 'auto';
    }
}

function handleCellClick(e) {
    const cell = e.target;
    const index = parseInt(cell.dataset.index, 10);
    if (board[index] !== '' || !gameActive || (gameMode === 'vs-cpu' && currentPlayer === 'O')) return;
    makeMove(index, currentPlayer);
    if (gameActive && gameMode === 'vs-cpu' && currentPlayer === 'O') {
        clearTimers();
        aiMoveTimer = setTimeout(cpuMove, 600);
    }
}

function getRandomMove() {
    const available = board.map((val, idx) => val === '' ? idx : null).filter(val => val !== null);
    if (available.length === 0) return -1;
    return available[Math.floor(Math.random() * available.length)];
}

function checkWinnerForMinimax() {
    for (let i = 0; i < WIN_CONDITIONS.length; i++) {
        const [a, b, c] = WIN_CONDITIONS[i];
        if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
    }
    if (!board.includes('')) return 'Draw';
    return null;
}

function minimax(newBoard, depth, isMaximizing) {
    const result = checkWinnerForMinimax();
    if (result !== null) {
        if (result === 'O') return 10 - depth;
        if (result === 'X') return depth - 10;
        return 0;
    }
    if (isMaximizing) {
        let bestScore = -Infinity;
        for (let i = 0; i < 9; i++) {
            if (newBoard[i] === '') {
                newBoard[i] = 'O';
                const score = minimax(newBoard, depth + 1, false);
                newBoard[i] = '';
                bestScore = Math.max(score, bestScore);
            }
        }
        return bestScore;
    }
    let bestScore = Infinity;
    for (let i = 0; i < 9; i++) {
        if (newBoard[i] === '') {
            newBoard[i] = 'X';
            const score = minimax(newBoard, depth + 1, true);
            newBoard[i] = '';
            bestScore = Math.min(score, bestScore);
        }
    }
    return bestScore;
}

function getBestMove() {
    let bestScore = -Infinity;
    let move = -1;
    const emptyCount = board.filter(cell => cell === '').length;
    if (emptyCount === 8) {
        if (board[4] === '') return 4;
        const corners = [0, 2, 6, 8];
        return corners[Math.floor(Math.random() * corners.length)];
    }
    for (let i = 0; i < board.length; i++) {
        if (board[i] === '') {
            board[i] = 'O';
            const score = minimax(board, 0, false);
            board[i] = '';
            if (score > bestScore) {
                bestScore = score;
                move = i;
            }
        }
    }
    return move;
}

function cpuMove() {
    if (!gameActive) return;
    let moveIndex;
    if (difficulty === 'easy') moveIndex = getRandomMove();
    else if (difficulty === 'medium') moveIndex = Math.random() > 0.6 ? getBestMove() : getRandomMove();
    else moveIndex = getBestMove();
    if (moveIndex !== -1) makeMove(moveIndex, 'O');
}

function createParticles() {
    const container = document.getElementById('bg-particles');
    container.innerHTML = '';
    for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.classList.add('particle');
        const size = Math.random() * 20 + 10;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.animationDuration = `${Math.random() * 15 + 10}s`;
        particle.style.animationDelay = `${Math.random() * 10}s`;
        container.appendChild(particle);
    }
}

// Event Listeners - Attached once to prevent duplicates
document.getElementById('btn-vs-cpu').addEventListener('click', () => {
    gameMode = 'vs-cpu';
    showScreen('difficulty');
});

document.getElementById('btn-vs-local').addEventListener('click', () => {
    gameMode = 'vs-local';
    showScreen('theme');
});

document.getElementById('btn-back-theme').addEventListener('click', () => {
    showScreen(gameMode === 'vs-cpu' ? 'difficulty' : 'splash');
});

document.getElementById('btn-back-diff').addEventListener('click', () => showScreen('splash'));

document.getElementById('btn-back-setup').addEventListener('click', () => showScreen('theme'));

document.getElementById('btn-home').addEventListener('click', () => {
    playSound('click');
    resetGameState();
    scores = { X: 0, O: 0 };
    updateScores();
    setTheme('candy'); // Keep home independent from gameplay themes
    showScreen('splash');
});

document.querySelectorAll('.btn-diff').forEach(btn => {
    btn.addEventListener('click', (e) => {
        difficulty = e.target.dataset.diff;
        showScreen('theme');
    });
});

document.querySelectorAll('.theme-card').forEach(card => {
    card.addEventListener('click', (e) => {
        setTheme(e.currentTarget.dataset.theme);
        setupScreenForMode();
        showScreen('setup');
    });
});

document.getElementById('btn-start-game').addEventListener('click', () => {
    playerNames.X = inputPlayer1.value.trim() || 'Player 1';
    if (gameMode === 'vs-cpu') {
        playerNames.O = 'Computer';
        const remain = getThemeSymbols(currentTheme).filter(symbol => symbol !== selectedSymbols.x);
        selectedSymbols.o = remain[Math.floor(Math.random() * remain.length)] || getThemeSymbols(currentTheme)[1];
    } else {
        playerNames.O = inputPlayer2.value.trim() || 'Player 2';
    }
    updateBoardSymbols();
    startGame();
    showScreen('game');
});

symbolsPlayer1.addEventListener('click', (e) => {
    const btn = e.target.closest('.symbol-btn');
    if (!btn || btn.classList.contains('disabled')) return;
    selectedSymbols.x = btn.dataset.symbol;
    if (selectedSymbols.o === selectedSymbols.x) {
        const options = getThemeSymbols(currentTheme);
        selectedSymbols.o = options.find(symbol => symbol !== selectedSymbols.x) || options[1];
    }
    updateSymbolSelectionsUI();
});

symbolsPlayer2.addEventListener('click', (e) => {
    const btn = e.target.closest('.symbol-btn');
    if (!btn || btn.classList.contains('disabled')) return;
    selectedSymbols.o = btn.dataset.symbol;
    if (selectedSymbols.x === selectedSymbols.o) {
        const options = getThemeSymbols(currentTheme);
        selectedSymbols.x = options.find(symbol => symbol !== selectedSymbols.o) || options[0];
    }
    updateSymbolSelectionsUI();
});

document.getElementById('btn-restart').addEventListener('click', () => {
    playSound('click');
    startGame();
});

document.getElementById('btn-change-theme').addEventListener('click', () => {
    playSound('click');
    resetGameState();
    showScreen('theme');
});

document.getElementById('btn-play-again').addEventListener('click', () => {
    playSound('click');
    startGame();
});

document.getElementById('btn-modal-theme').addEventListener('click', () => {
    playSound('click');
    resetGameState();
    showScreen('theme');
});

document.getElementById('btn-modal-home').addEventListener('click', () => {
    playSound('click');
    resetGameState();
    scores = { X: 0, O: 0 };
    updateScores();
    setTheme('candy'); // Keep home independent from gameplay themes
    showScreen('splash');
});

document.querySelectorAll('.toggle-sound').forEach(btn => {
    btn.addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        document.querySelectorAll('.toggle-sound').forEach(b => {
            b.textContent = soundEnabled ? '🔊' : '🔇';
        });
        if (soundEnabled) playSound('click');
    });
});

cells.forEach(cell => cell.addEventListener('click', handleCellClick));

createParticles();
setTheme('candy');
updateScores();
