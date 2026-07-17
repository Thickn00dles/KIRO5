/* ============================================================
   APP.JS — Main Application Entry Point
   Initializes all managers, wires events between systems,
   updates stats bar and date/time display.
   ============================================================ */

(function () {
    'use strict';

    // ─── DOM References ───────────────────────────────────────

    const datetimeEl = document.getElementById('datetime');
    const statTokensEl = document.getElementById('stat-tokens');
    const statCompletedEl = document.getElementById('stat-completed');
    const statHighscoreEl = document.getElementById('stat-highscore');
    const statScoreEl = document.getElementById('stat-score');
    const gameCanvas = document.getElementById('game-canvas');
    const gameTokenNotice = document.getElementById('game-token-notice');
    const playBtn = document.getElementById('game-play-btn');
    const pauseBtn = document.getElementById('game-pause-btn');
    const restartBtn = document.getElementById('game-restart-btn');

    // ─── Initialize Systems ───────────────────────────────────

    // 1. Token Manager (must be first — others depend on it)
    const tokenManager = new TokenManager();

    // 2. To-Do Manager (needs tokenManager for awarding tokens)
    const todoManager = new TodoManager(tokenManager);

    // 3. Competition Manager (needs todoManager for progress tracking)
    const competitionManager = new CompetitionManager(todoManager);

    // 4. Flappy Bird Game (needs tokenManager for consuming tokens)
    const game = new FlappyGame(gameCanvas, tokenManager);

    // ─── Stats Bar Updates ────────────────────────────────────

    /**
     * Update all stats bar values from current state.
     */
    function updateStatsBar() {
        const tokenState = tokenManager.getState();
        statTokensEl.textContent = tokenState.tokens;
        statCompletedEl.textContent = tokenState.totalCompleted;
        statHighscoreEl.textContent = game.getHighScore();
        statScoreEl.textContent = game.score;

        // Update play button state
        updatePlayButton();
    }

    /**
     * Update play button enabled/disabled state and token notice.
     */
    function updatePlayButton() {
        const hasTokens = tokenManager.hasTokens();
        const isIdle = game.state === FlappyGame.IDLE;

        playBtn.disabled = !hasTokens || !isIdle;

        // Pulsing animation when tokens available and game is idle
        if (hasTokens && isIdle) {
            playBtn.classList.add('has-tokens');
        } else {
            playBtn.classList.remove('has-tokens');
        }

        // Token notice visibility
        if (!hasTokens && isIdle) {
            gameTokenNotice.classList.remove('hidden');
        } else {
            gameTokenNotice.classList.add('hidden');
        }
    }

    // ─── Wire Token Events ────────────────────────────────────

    tokenManager.onChange((state) => {
        // Animate token count change
        statTokensEl.textContent = state.tokens;
        statTokensEl.classList.remove('token-earned');
        // Force reflow to restart animation
        void statTokensEl.offsetWidth;
        statTokensEl.classList.add('token-earned');

        statCompletedEl.textContent = state.totalCompleted;
        updatePlayButton();
    });

    // ─── Wire Game Events ─────────────────────────────────────

    // Score changes during gameplay
    game.onScoreChange = (score) => {
        statScoreEl.textContent = score;
    };

    // Game over callback
    game.onGameOver = (score, highScore) => {
        statHighscoreEl.textContent = highScore;
        statScoreEl.textContent = score;

        // Re-enable controls after game over
        pauseBtn.disabled = true;
        restartBtn.disabled = false;
        updatePlayButton();
    };

    // ─── Game Control Buttons ─────────────────────────────────

    // Play button — starts game (consumes token)
    playBtn.addEventListener('click', () => {
        if (game.state === FlappyGame.IDLE && tokenManager.hasTokens()) {
            const started = game.start();
            if (started) {
                playBtn.disabled = true;
                playBtn.classList.remove('has-tokens');
                pauseBtn.disabled = false;
                restartBtn.disabled = true;
                gameTokenNotice.classList.add('hidden');
                updateStatsBar();
            }
        }
    });

    // Pause button
    pauseBtn.addEventListener('click', () => {
        if (game.state === FlappyGame.PLAYING) {
            game.pause();
            pauseBtn.textContent = '▶ Resume';
        } else if (game.state === FlappyGame.PAUSED) {
            game.resume();
            pauseBtn.textContent = '⏸ Pause';
        }
    });

    // Restart button — goes back to idle
    restartBtn.addEventListener('click', () => {
        game.reset();
        pauseBtn.textContent = '⏸ Pause';
        pauseBtn.disabled = true;
        restartBtn.disabled = true;
        statScoreEl.textContent = '0';
        updatePlayButton();
    });

    // ─── Date & Time Display ──────────────────────────────────

    /**
     * Format and display current date/time.
     */
    function updateDateTime() {
        const now = new Date();
        const options = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        };
        datetimeEl.textContent = now.toLocaleDateString('en-US', options);
    }

    // Update immediately and then every second
    updateDateTime();
    setInterval(updateDateTime, 1000);

    // ─── Initial State Setup ──────────────────────────────────

    // Set initial stats
    updateStatsBar();

    // Set initial button states
    pauseBtn.disabled = true;
    restartBtn.disabled = true;

    // Log initialization
    console.log('🚀 Productivity Hub initialized!');
    console.log(`📊 Tokens: ${tokenManager.getState().tokens}, Tasks completed: ${tokenManager.getState().totalCompleted}, High score: ${game.getHighScore()}`);
    console.log(`⚔️ Active challenges: ${competitionManager.challenges.length}`);

})();
