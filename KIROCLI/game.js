/* ============================================================
   GAME.JS — Flappy Bird Mini-Game Engine
   Responsive canvas, kawaii bird character, pipe obstacles,
   collision detection, scoring, game states, high score.
   ============================================================ */

// Polyfill for CanvasRenderingContext2D.roundRect (older browsers)
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, radii) {
        const r = Array.isArray(radii) ? radii : [radii, radii, radii, radii];
        const [tl, tr, br, bl] = r.map(v => Math.min(v || 0, w / 2, h / 2));
        this.moveTo(x + tl, y);
        this.lineTo(x + w - tr, y);
        this.quadraticCurveTo(x + w, y, x + w, y + tr);
        this.lineTo(x + w, y + h - br);
        this.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
        this.lineTo(x + bl, y + h);
        this.quadraticCurveTo(x, y + h, x, y + h - bl);
        this.lineTo(x, y + tl);
        this.quadraticCurveTo(x, y, x + tl, y);
        this.closePath();
        return this;
    };
}

class FlappyGame {
    // Game states
    static IDLE = 'IDLE';
    static PLAYING = 'PLAYING';
    static PAUSED = 'PAUSED';
    static GAMEOVER = 'GAMEOVER';

    /**
     * @param {HTMLCanvasElement} canvas - The game canvas element
     * @param {TokenManager} tokenManager - Token system reference
     */
    constructor(canvas, tokenManager) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.tokenManager = tokenManager;

        /** @type {string} Current game state */
        this.state = FlappyGame.IDLE;

        /** @type {number} Current score this round */
        this.score = 0;

        /** @type {number} Highest score ever */
        this.highScore = this.loadHighScore();

        /** @type {number} Frame counter for animations */
        this.frameCount = 0;

        /** @type {number|null} requestAnimationFrame ID */
        this.animationId = null;

        /** @type {Function|null} External callback when score changes */
        this.onScoreChange = null;

        /** @type {Function|null} External callback when game ends */
        this.onGameOver = null;

        // Initialize game dimensions and objects
        this._resize();
        this._initBird();
        this._initPipes();
        this._initClouds();

        // Bind events
        this._bindEvents();

        // Start the render loop (draws idle screen)
        this._loop();
    }

    // ─── Initialization ───────────────────────────────────────

    /**
     * Set canvas dimensions to match container.
     * All game measurements scale with canvas size.
     * @private
     */
    _resize() {
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();
        
        // Set canvas drawing dimensions (high-DPI support)
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.ctx.scale(dpr, dpr);

        // Logical dimensions for game math
        this.width = rect.width;
        this.height = rect.height;

        // Scale-dependent constants (all relative to canvas size)
        this.BIRD_RADIUS = this.width * 0.045;
        this.GRAVITY = this.height * 0.0008;
        this.JUMP_VELOCITY = this.height * -0.015;
        this.TERMINAL_VELOCITY = this.height * 0.02;
        this.PIPE_WIDTH = this.width * 0.12;
        this.PIPE_GAP = this.height * 0.28; // Generous gap for casual play
        this.PIPE_SPACING = this.width * 0.45;
        this.BASE_SPEED = this.width * 0.003;
        this.GROUND_HEIGHT = this.height * 0.08;
    }

    /** @private */
    _initBird() {
        this.bird = {
            x: this.width * 0.25,
            y: this.height * 0.4,
            velocity: 0,
            rotation: 0,
            wingAngle: 0
        };
    }

    /** @private */
    _initPipes() {
        this.pipes = [];
        this.pipesPassed = 0;
        this.speed = this.BASE_SPEED;
    }

    /** @private - Decorative background clouds */
    _initClouds() {
        this.clouds = [];
        for (let i = 0; i < 4; i++) {
            this.clouds.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height * 0.4 + this.height * 0.05,
                size: Math.random() * 30 + 20,
                speed: Math.random() * 0.3 + 0.1
            });
        }
    }

    // ─── Event Handling ───────────────────────────────────────

    /** @private */
    _bindEvents() {
        // Keyboard input
        this._keyHandler = (e) => {
            if (e.key === ' ' || e.key === 'ArrowUp') {
                e.preventDefault();
                this._handleJump();
            }
            if (e.key === 'Escape') {
                this._handlePause();
            }
        };
        document.addEventListener('keydown', this._keyHandler);

        // Click/tap on canvas
        this._clickHandler = (e) => {
            e.preventDefault();
            this._handleJump();
        };
        this.canvas.addEventListener('click', this._clickHandler);
        this.canvas.addEventListener('touchstart', this._clickHandler, { passive: false });

        // Window resize
        this._resizeHandler = () => {
            this._resize();
            // Re-init clouds for new dimensions
            this._initClouds();
        };
        window.addEventListener('resize', this._resizeHandler);
    }

    /** @private */
    _handleJump() {
        if (this.state === FlappyGame.PLAYING) {
            this.bird.velocity = this.JUMP_VELOCITY;
        } else if (this.state === FlappyGame.GAMEOVER) {
            // Click to go back to idle after game over
            this.reset();
        }
    }

    /** @private */
    _handlePause() {
        if (this.state === FlappyGame.PLAYING) {
            this.state = FlappyGame.PAUSED;
        } else if (this.state === FlappyGame.PAUSED) {
            this.state = FlappyGame.PLAYING;
        }
    }

    // ─── Game Control ─────────────────────────────────────────

    /**
     * Start a new game round (called from Play button).
     * Consumes one token.
     * @returns {boolean} True if game started, false if no tokens.
     */
    start() {
        if (!this.tokenManager.consumeToken()) {
            return false;
        }

        this.state = FlappyGame.PLAYING;
        this.score = 0;
        this.pipesPassed = 0;
        this.speed = this.BASE_SPEED;
        this._initBird();
        this.pipes = [];
        this.frameCount = 0;

        if (this.onScoreChange) this.onScoreChange(this.score);
        return true;
    }

    /**
     * Pause the game.
     */
    pause() {
        if (this.state === FlappyGame.PLAYING) {
            this.state = FlappyGame.PAUSED;
        }
    }

    /**
     * Resume from pause.
     */
    resume() {
        if (this.state === FlappyGame.PAUSED) {
            this.state = FlappyGame.PLAYING;
        }
    }

    /**
     * Reset game to idle state.
     */
    reset() {
        this.state = FlappyGame.IDLE;
        this.score = 0;
        this._initBird();
        this._initPipes();
        if (this.onScoreChange) this.onScoreChange(this.score);
    }

    // ─── Game Loop ────────────────────────────────────────────

    /** @private */
    _loop() {
        this._update();
        this._draw();
        this.animationId = requestAnimationFrame(() => this._loop());
    }

    /** @private */
    _update() {
        this.frameCount++;

        // Always animate clouds
        this._updateClouds();

        if (this.state === FlappyGame.PLAYING) {
            this._updateBird();
            this._updatePipes();
            this._checkCollisions();
        } else if (this.state === FlappyGame.IDLE) {
            // Idle bird bob animation
            this.bird.y = this.height * 0.4 + Math.sin(this.frameCount * 0.04) * 10;
            this.bird.wingAngle = Math.sin(this.frameCount * 0.1) * 0.3;
        }
    }

    /** @private */
    _updateBird() {
        // Apply gravity
        this.bird.velocity += this.GRAVITY;

        // Cap terminal velocity
        if (this.bird.velocity > this.TERMINAL_VELOCITY) {
            this.bird.velocity = this.TERMINAL_VELOCITY;
        }

        // Update position
        this.bird.y += this.bird.velocity;

        // Rotation based on velocity
        const maxRotation = Math.PI / 4; // 45 degrees
        this.bird.rotation = Math.min(
            maxRotation,
            Math.max(-maxRotation, this.bird.velocity / this.TERMINAL_VELOCITY * maxRotation)
        );

        // Wing flapping animation (faster when jumping)
        const flapSpeed = this.bird.velocity < 0 ? 0.3 : 0.1;
        this.bird.wingAngle = Math.sin(this.frameCount * flapSpeed) * 0.5;

        // Ceiling boundary
        if (this.bird.y - this.BIRD_RADIUS < 0) {
            this.bird.y = this.BIRD_RADIUS;
            this.bird.velocity = 0;
        }
    }

    /** @private */
    _updatePipes() {
        // Spawn new pipes
        const lastPipe = this.pipes[this.pipes.length - 1];
        if (!lastPipe || lastPipe.x < this.width - this.PIPE_SPACING) {
            // Random gap position: between 20% and 70% of playable height
            const playableHeight = this.height - this.GROUND_HEIGHT;
            const minGapY = playableHeight * 0.2 + this.PIPE_GAP / 2;
            const maxGapY = playableHeight * 0.75 - this.PIPE_GAP / 2;
            const gapY = Math.random() * (maxGapY - minGapY) + minGapY;

            this.pipes.push({
                x: this.width + this.PIPE_WIDTH,
                gapY,
                gapHeight: this.PIPE_GAP,
                width: this.PIPE_WIDTH,
                passed: false
            });
        }

        // Move pipes and check for scoring
        for (let i = this.pipes.length - 1; i >= 0; i--) {
            const pipe = this.pipes[i];
            pipe.x -= this.speed;

            // Score when bird passes pipe
            if (!pipe.passed && pipe.x + pipe.width < this.bird.x) {
                pipe.passed = true;
                this.score++;
                this.pipesPassed++;

                // Gentle speed increase: +0.5% every 5 pipes, capped at 1.5x
                if (this.pipesPassed % 5 === 0) {
                    this.speed = Math.min(this.BASE_SPEED * 1.5, this.speed + this.BASE_SPEED * 0.05);
                }

                if (this.onScoreChange) this.onScoreChange(this.score);
            }

            // Remove off-screen pipes
            if (pipe.x + pipe.width < -10) {
                this.pipes.splice(i, 1);
            }
        }
    }

    /** @private */
    _updateClouds() {
        this.clouds.forEach(cloud => {
            cloud.x -= cloud.speed;
            if (cloud.x + cloud.size < 0) {
                cloud.x = this.width + cloud.size;
                cloud.y = Math.random() * this.height * 0.4 + this.height * 0.05;
            }
        });
    }

    // ─── Collision Detection ──────────────────────────────────

    /** @private */
    _checkCollisions() {
        const birdLeft = this.bird.x - this.BIRD_RADIUS * 0.7; // Slightly forgiving hitbox
        const birdRight = this.bird.x + this.BIRD_RADIUS * 0.7;
        const birdTop = this.bird.y - this.BIRD_RADIUS * 0.7;
        const birdBottom = this.bird.y + this.BIRD_RADIUS * 0.7;

        // Ground collision
        if (birdBottom >= this.height - this.GROUND_HEIGHT) {
            this._gameOver();
            return;
        }

        // Pipe collision
        for (const pipe of this.pipes) {
            const pipeLeft = pipe.x;
            const pipeRight = pipe.x + pipe.width;
            const gapTop = pipe.gapY - pipe.gapHeight / 2;
            const gapBottom = pipe.gapY + pipe.gapHeight / 2;

            // Check if bird is horizontally within pipe
            if (birdRight > pipeLeft && birdLeft < pipeRight) {
                // Check if bird is outside the gap (hitting top or bottom pipe)
                if (birdTop < gapTop || birdBottom > gapBottom) {
                    this._gameOver();
                    return;
                }
            }
        }
    }

    /** @private */
    _gameOver() {
        this.state = FlappyGame.GAMEOVER;

        // Update high score
        if (this.score > this.highScore) {
            this.highScore = this.score;
            this.saveHighScore();
        }

        if (this.onGameOver) this.onGameOver(this.score, this.highScore);
    }

    // ─── Drawing ──────────────────────────────────────────────

    /** @private */
    _draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.width, this.height);

        // Background gradient
        this._drawBackground();

        // Clouds
        this._drawClouds();

        // Pipes (only during gameplay or game over)
        if (this.state === FlappyGame.PLAYING || this.state === FlappyGame.GAMEOVER || this.state === FlappyGame.PAUSED) {
            this._drawPipes();
        }

        // Ground
        this._drawGround();

        // Bird (always visible)
        this._drawBird();

        // UI overlays based on state
        switch (this.state) {
            case FlappyGame.IDLE:
                this._drawIdleScreen();
                break;
            case FlappyGame.PLAYING:
                this._drawScore();
                break;
            case FlappyGame.PAUSED:
                this._drawScore();
                this._drawPausedScreen();
                break;
            case FlappyGame.GAMEOVER:
                this._drawGameOverScreen();
                break;
        }
    }

    /** @private */
    _drawBackground() {
        const ctx = this.ctx;
        const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
        gradient.addColorStop(0, '#d6eef8'); // Baby blue
        gradient.addColorStop(0.7, '#e8e0ff'); // Lavender light
        gradient.addColorStop(1, '#d4f5e4'); // Mint light
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.width, this.height);
    }

    /** @private */
    _drawClouds() {
        const ctx = this.ctx;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        this.clouds.forEach(cloud => {
            ctx.beginPath();
            ctx.arc(cloud.x, cloud.y, cloud.size, 0, Math.PI * 2);
            ctx.arc(cloud.x + cloud.size * 0.6, cloud.y - cloud.size * 0.2, cloud.size * 0.7, 0, Math.PI * 2);
            ctx.arc(cloud.x - cloud.size * 0.5, cloud.y + cloud.size * 0.1, cloud.size * 0.6, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    /** @private */
    _drawGround() {
        const ctx = this.ctx;
        const groundY = this.height - this.GROUND_HEIGHT;

        // Ground body
        ctx.fillStyle = '#a8e6cf'; // Mint
        ctx.fillRect(0, groundY, this.width, this.GROUND_HEIGHT);

        // Grass line
        ctx.fillStyle = '#7dcba8';
        ctx.fillRect(0, groundY, this.width, 4);

        // Simple grass tufts
        ctx.fillStyle = '#7dcba8';
        for (let x = 0; x < this.width; x += 20) {
            ctx.beginPath();
            ctx.moveTo(x, groundY);
            ctx.lineTo(x + 5, groundY - 5);
            ctx.lineTo(x + 10, groundY);
            ctx.fill();
        }
    }

    /** @private */
    _drawPipes() {
        const ctx = this.ctx;

        this.pipes.forEach(pipe => {
            const gapTop = pipe.gapY - pipe.gapHeight / 2;
            const gapBottom = pipe.gapY + pipe.gapHeight / 2;
            const groundY = this.height - this.GROUND_HEIGHT;

            // Pipe colors - kawaii pastel style
            const pipeGradient = ctx.createLinearGradient(pipe.x, 0, pipe.x + pipe.width, 0);
            pipeGradient.addColorStop(0, '#b8d4e3');
            pipeGradient.addColorStop(0.5, '#d6eef8');
            pipeGradient.addColorStop(1, '#b8d4e3');

            // Top pipe
            ctx.fillStyle = pipeGradient;
            ctx.beginPath();
            ctx.roundRect(pipe.x, 0, pipe.width, gapTop, [0, 0, 8, 8]);
            ctx.fill();

            // Top pipe cap
            ctx.fillStyle = '#9ec5d6';
            ctx.beginPath();
            ctx.roundRect(pipe.x - 4, gapTop - 16, pipe.width + 8, 16, [6, 6, 0, 0]);
            ctx.fill();

            // Bottom pipe
            ctx.fillStyle = pipeGradient;
            ctx.beginPath();
            ctx.roundRect(pipe.x, gapBottom, pipe.width, groundY - gapBottom, [8, 8, 0, 0]);
            ctx.fill();

            // Bottom pipe cap
            ctx.fillStyle = '#9ec5d6';
            ctx.beginPath();
            ctx.roundRect(pipe.x - 4, gapBottom, pipe.width + 8, 16, [0, 0, 6, 6]);
            ctx.fill();
        });
    }

    /** @private - Draw the kawaii bird character */
    _drawBird() {
        const ctx = this.ctx;
        const { x, y, rotation, wingAngle } = this.bird;
        const r = this.BIRD_RADIUS;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);

        // Body - peach/coral color
        ctx.fillStyle = '#ffb7b2';
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();

        // Body outline
        ctx.strokeStyle = '#e8918b';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Belly - white circle
        ctx.fillStyle = '#fff5f4';
        ctx.beginPath();
        ctx.arc(r * 0.1, r * 0.2, r * 0.55, 0, Math.PI * 2);
        ctx.fill();

        // Eyes - cute dot eyes
        const eyeOffset = r * 0.25;
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(r * 0.3, -eyeOffset, r * 0.12, 0, Math.PI * 2);
        ctx.fill();

        // Eye shine
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(r * 0.35, -eyeOffset - r * 0.05, r * 0.05, 0, Math.PI * 2);
        ctx.fill();

        // Beak - small orange triangle
        ctx.fillStyle = '#ffb347';
        ctx.beginPath();
        ctx.moveTo(r * 0.7, 0);
        ctx.lineTo(r * 1.1, r * 0.1);
        ctx.lineTo(r * 0.7, r * 0.2);
        ctx.closePath();
        ctx.fill();

        // Wing - small arc that oscillates
        ctx.fillStyle = '#ff9a94';
        ctx.save();
        ctx.translate(-r * 0.3, r * 0.1);
        ctx.rotate(wingAngle);
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 0.45, r * 0.25, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Blush marks (cute kawaii detail)
        ctx.fillStyle = 'rgba(255, 150, 150, 0.4)';
        ctx.beginPath();
        ctx.ellipse(-r * 0.1, r * 0.25, r * 0.15, r * 0.08, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(r * 0.5, r * 0.15, r * 0.12, r * 0.07, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    // ─── Screen Overlays ──────────────────────────────────────

    /** @private */
    _drawIdleScreen() {
        const ctx = this.ctx;

        // Semi-transparent overlay
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fillRect(0, 0, this.width, this.height);

        // Title
        ctx.fillStyle = '#374151';
        ctx.font = `bold ${this.width * 0.06}px -apple-system, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('🐦 Flappy Bird', this.width / 2, this.height * 0.25);

        // Instructions
        ctx.fillStyle = '#6b7280';
        ctx.font = `${this.width * 0.035}px -apple-system, sans-serif`;
        ctx.fillText('Press Play to start!', this.width / 2, this.height * 0.7);
        ctx.fillText('Tap or press Space to jump', this.width / 2, this.height * 0.76);
    }

    /** @private */
    _drawScore() {
        const ctx = this.ctx;

        // Score - large, centered at top
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.lineWidth = 3;
        ctx.font = `bold ${this.width * 0.1}px -apple-system, sans-serif`;
        ctx.textAlign = 'center';
        ctx.strokeText(this.score.toString(), this.width / 2, this.height * 0.1);
        ctx.fillText(this.score.toString(), this.width / 2, this.height * 0.1);
    }

    /** @private */
    _drawPausedScreen() {
        const ctx = this.ctx;

        // Overlay
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillRect(0, 0, this.width, this.height);

        // Paused text
        ctx.fillStyle = '#374151';
        ctx.font = `bold ${this.width * 0.07}px -apple-system, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('⏸ Paused', this.width / 2, this.height * 0.45);

        ctx.fillStyle = '#6b7280';
        ctx.font = `${this.width * 0.035}px -apple-system, sans-serif`;
        ctx.fillText('Press Esc to resume', this.width / 2, this.height * 0.55);
    }

    /** @private */
    _drawGameOverScreen() {
        const ctx = this.ctx;

        // Dark overlay
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillRect(0, 0, this.width, this.height);

        // Game Over title
        ctx.fillStyle = '#dc2626';
        ctx.font = `bold ${this.width * 0.07}px -apple-system, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('Game Over!', this.width / 2, this.height * 0.3);

        // Score
        ctx.fillStyle = '#374151';
        ctx.font = `bold ${this.width * 0.05}px -apple-system, sans-serif`;
        ctx.fillText(`Score: ${this.score}`, this.width / 2, this.height * 0.42);

        // High score
        ctx.fillStyle = '#7c3aed';
        ctx.font = `${this.width * 0.04}px -apple-system, sans-serif`;
        ctx.fillText(`🏆 Best: ${this.highScore}`, this.width / 2, this.height * 0.52);

        // Instruction
        ctx.fillStyle = '#6b7280';
        ctx.font = `${this.width * 0.03}px -apple-system, sans-serif`;
        ctx.fillText('Tap or click to continue', this.width / 2, this.height * 0.65);
    }

    // ─── High Score Persistence ───────────────────────────────

    /**
     * Load high score from localStorage.
     * @returns {number}
     */
    loadHighScore() {
        try {
            const score = localStorage.getItem('flappy_highscore');
            return score ? parseInt(score, 10) || 0 : 0;
        } catch (e) {
            return 0;
        }
    }

    /**
     * Save high score to localStorage.
     */
    saveHighScore() {
        try {
            localStorage.setItem('flappy_highscore', this.highScore.toString());
        } catch (e) {
            console.warn('FlappyGame: Failed to save high score.', e);
        }
    }

    /**
     * Get the current high score.
     * @returns {number}
     */
    getHighScore() {
        return this.highScore;
    }

    // ─── Cleanup ──────────────────────────────────────────────

    /**
     * Remove all event listeners and stop animation loop.
     * Call this if the game is removed from the page.
     */
    destroy() {
        document.removeEventListener('keydown', this._keyHandler);
        this.canvas.removeEventListener('click', this._clickHandler);
        this.canvas.removeEventListener('touchstart', this._clickHandler);
        window.removeEventListener('resize', this._resizeHandler);

        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
    }
}
