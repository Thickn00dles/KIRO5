/* ============================================================
   TOKENS.JS — Token Reward System
   Manages game tokens earned by completing tasks.
   Every 3 tasks completed = 1 token earned.
   Tokens persist forever in localStorage.
   ============================================================ */

class TokenManager {
    constructor() {
        /** @type {number} Available game tokens */
        this.tokens = 0;

        /** @type {number} Cumulative tasks completed (never resets) */
        this.totalCompleted = 0;

        /** @type {number} Last completion count at which tokens were awarded */
        this.lastAwardedAt = 0;

        /** @type {Function[]} Callbacks triggered on token/state changes */
        this._listeners = [];

        // Load persisted state
        this.load();
    }

    // ─── Persistence ──────────────────────────────────────────

    /**
     * Load token state from localStorage.
     * Falls back to defaults if data is missing or corrupt.
     */
    load() {
        try {
            const data = localStorage.getItem('productivity_tokens');
            if (data) {
                const parsed = JSON.parse(data);
                this.tokens = typeof parsed.tokens === 'number' ? parsed.tokens : 0;
                this.totalCompleted = typeof parsed.totalCompleted === 'number' ? parsed.totalCompleted : 0;
                this.lastAwardedAt = typeof parsed.lastAwardedAt === 'number' ? parsed.lastAwardedAt : 0;
            }
        } catch (e) {
            // Corrupted data — start fresh
            console.warn('TokenManager: Failed to load state, resetting.', e);
            this.tokens = 0;
            this.totalCompleted = 0;
            this.lastAwardedAt = 0;
        }
    }

    /**
     * Persist current state to localStorage.
     */
    save() {
        try {
            localStorage.setItem('productivity_tokens', JSON.stringify({
                tokens: this.tokens,
                totalCompleted: this.totalCompleted,
                lastAwardedAt: this.lastAwardedAt
            }));
        } catch (e) {
            console.warn('TokenManager: Failed to save state.', e);
        }
    }

    // ─── Token Logic ──────────────────────────────────────────

    /**
     * Called when a task is marked as complete.
     * Awards 1 token for every 3 cumulative completions.
     * @returns {number} Number of new tokens earned (0 or more)
     */
    onTaskCompleted() {
        this.totalCompleted++;

        // Calculate how many tokens should have been earned total
        const totalTokensDeserved = Math.floor(this.totalCompleted / 3);
        const totalTokensAwarded = Math.floor(this.lastAwardedAt / 3);
        const newTokens = totalTokensDeserved - totalTokensAwarded;

        if (newTokens > 0) {
            this.tokens += newTokens;
            this.lastAwardedAt = this.totalCompleted;
        }

        this.save();
        this._notify();
        return newTokens;
    }

    /**
     * Consume one token to play the game.
     * @returns {boolean} True if token was consumed, false if none available.
     */
    consumeToken() {
        if (this.tokens <= 0) return false;
        this.tokens--;
        this.save();
        this._notify();
        return true;
    }

    /**
     * Check if at least one token is available.
     * @returns {boolean}
     */
    hasTokens() {
        return this.tokens > 0;
    }

    /**
     * Get current state for UI display.
     * @returns {{ tokens: number, totalCompleted: number }}
     */
    getState() {
        return {
            tokens: this.tokens,
            totalCompleted: this.totalCompleted
        };
    }

    // ─── Event System ─────────────────────────────────────────

    /**
     * Register a callback for state changes.
     * @param {Function} callback - Called with getState() on change
     */
    onChange(callback) {
        if (typeof callback === 'function') {
            this._listeners.push(callback);
        }
    }

    /**
     * Remove a registered callback.
     * @param {Function} callback
     */
    offChange(callback) {
        this._listeners = this._listeners.filter(cb => cb !== callback);
    }

    /**
     * Notify all listeners of state change.
     * @private
     */
    _notify() {
        const state = this.getState();
        this._listeners.forEach(cb => {
            try {
                cb(state);
            } catch (e) {
                console.warn('TokenManager: Listener error', e);
            }
        });
    }
}
