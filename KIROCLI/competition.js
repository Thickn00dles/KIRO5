/* ============================================================
   COMPETITION.JS — Todo Competition System
   Enables friendly competitions between friends using
   URL-encoded invite links and localStorage for state.
   No backend required.
   ============================================================ */

class CompetitionManager {
    /** URL parameter keys */
    static PARAM_INVITE = 'challenge';
    static PARAM_PROGRESS = 'progress';

    /**
     * @param {TodoManager} todoManager - Reference to todo system for stats
     */
    constructor(todoManager) {
        /** @type {TodoManager} */
        this.todoManager = todoManager;

        /** @type {Array<Object>} All challenges */
        this.challenges = [];

        /** @type {string} User's display name (remembered) */
        this.userName = '';

        /** @type {string} Current view: 'challenges', 'create', 'leaderboard' */
        this.currentView = 'challenges';

        // DOM References
        this.tabBtns = document.querySelectorAll('.comp-tabs__btn');
        this.createView = document.getElementById('comp-create-view');
        this.challengesView = document.getElementById('comp-challenges-view');
        this.leaderboardView = document.getElementById('comp-leaderboard-view');
        this.challengesList = document.getElementById('comp-challenges-list');
        this.challengesEmpty = document.getElementById('comp-challenges-empty');
        this.leaderboardEl = document.getElementById('comp-leaderboard');
        this.leaderboardEmpty = document.getElementById('comp-leaderboard-empty');
        this.leaderboardSelect = document.getElementById('comp-leaderboard-challenge');

        // Create form elements
        this.createForm = document.getElementById('comp-create-form');
        this.nameInput = document.getElementById('comp-your-name');
        this.challengeNameInput = document.getElementById('comp-challenge-name');
        this.durationSelect = document.getElementById('comp-duration');
        this.goalInput = document.getElementById('comp-goal');

        // Invite display elements
        this.inviteDisplay = document.getElementById('comp-invite-display');
        this.inviteLinkInput = document.getElementById('comp-invite-link');
        this.inviteCopyBtn = document.getElementById('comp-invite-copy');
        this.inviteCloseBtn = document.getElementById('comp-invite-close');
        this.inviteCopiedMsg = document.getElementById('comp-invite-copied');

        // Share progress display elements
        this.shareDisplay = document.getElementById('comp-share-display');
        this.shareLinkInput = document.getElementById('comp-share-link');
        this.shareCopyBtn = document.getElementById('comp-share-copy');
        this.shareCloseBtn = document.getElementById('comp-share-close');
        this.shareCopiedMsg = document.getElementById('comp-share-copied');

        // Load state
        this.load();

        // Bind events
        this._bindEvents();

        // Check URL for incoming invite or progress update
        this._processUrlParams();

        // Initial render
        this.renderView();
    }

    // ─── Event Binding ────────────────────────────────────────

    /** @private */
    _bindEvents() {
        // Tab switching
        this.tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.setView(btn.dataset.compView);
            });
        });

        // Create challenge form
        this.createForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.createChallenge();
        });

        // Leaderboard challenge selector
        this.leaderboardSelect.addEventListener('change', () => {
            this.renderLeaderboard(this.leaderboardSelect.value);
        });

        // Invite link copy
        this.inviteCopyBtn.addEventListener('click', () => {
            this._copyToClipboard(this.inviteLinkInput.value, this.inviteCopiedMsg);
        });

        // Invite close
        this.inviteCloseBtn.addEventListener('click', () => {
            this.inviteDisplay.classList.add('hidden');
        });

        // Share progress copy
        this.shareCopyBtn.addEventListener('click', () => {
            this._copyToClipboard(this.shareLinkInput.value, this.shareCopiedMsg);
        });

        // Share close
        this.shareCloseBtn.addEventListener('click', () => {
            this.shareDisplay.classList.add('hidden');
        });

        // Challenge list event delegation
        this.challengesList.addEventListener('click', (e) => {
            const challengeEl = e.target.closest('.comp-challenge-card');
            if (!challengeEl) return;
            const id = challengeEl.dataset.id;

            if (e.target.closest('.comp-challenge__btn--invite')) {
                this.showInviteLink(id);
            }
            if (e.target.closest('.comp-challenge__btn--share')) {
                this.showShareProgress(id);
            }
            if (e.target.closest('.comp-challenge__btn--delete')) {
                this.deleteChallenge(id, challengeEl);
            }
            if (e.target.closest('.comp-challenge__btn--leaderboard')) {
                this.leaderboardSelect.value = id;
                this.setView('leaderboard');
                this.renderLeaderboard(id);
            }
        });
    }

    // ─── View Management ──────────────────────────────────────

    /**
     * Switch competition view.
     * @param {string} view
     */
    setView(view) {
        this.currentView = view;

        // Update tabs
        this.tabBtns.forEach(btn => {
            const isActive = btn.dataset.compView === view;
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-selected', isActive.toString());
        });

        // Show/hide views
        this.createView.classList.toggle('hidden', view !== 'create');
        this.challengesView.classList.toggle('hidden', view !== 'challenges');
        this.leaderboardView.classList.toggle('hidden', view !== 'leaderboard');

        // Render appropriate content
        if (view === 'challenges') {
            this.renderChallenges();
        } else if (view === 'leaderboard') {
            this._populateLeaderboardSelect();
        } else if (view === 'create') {
            // Pre-fill saved name
            if (this.userName) {
                this.nameInput.value = this.userName;
            }
        }
    }

    // ─── Challenge CRUD ───────────────────────────────────────

    /**
     * Create a new challenge.
     */
    createChallenge() {
        const name = this.challengeNameInput.value.trim();
        const creatorName = this.nameInput.value.trim();
        const duration = parseInt(this.durationSelect.value, 10);
        const goal = this.goalInput.value ? parseInt(this.goalInput.value, 10) : null;

        if (!name || !creatorName) return;

        // Remember user name
        this.userName = creatorName;

        // Get current todo stats as baseline
        const stats = this.todoManager.getStats();

        const challenge = {
            id: this._generateId(),
            name,
            creatorName,
            duration,
            goal,
            startTime: Date.now(),
            endTime: Date.now() + (duration * 24 * 60 * 60 * 1000),
            participants: [
                {
                    name: creatorName,
                    isCreator: true,
                    tasksAtStart: stats.completed,
                    tasksCompleted: 0,
                    lastUpdated: Date.now()
                }
            ]
        };

        this.challenges.unshift(challenge);
        this.save();

        // Reset form
        this.challengeNameInput.value = '';
        this.goalInput.value = '';

        // Show invite link
        this.showInviteLink(challenge.id);

        // Switch to challenges view
        this.setView('challenges');
    }

    /**
     * Delete a challenge.
     * @param {string} id
     * @param {HTMLElement} [el]
     */
    deleteChallenge(id, el) {
        if (el) {
            el.classList.add('comp-card-exit');
            el.addEventListener('animationend', () => {
                this.challenges = this.challenges.filter(c => c.id !== id);
                this.save();
                this.renderChallenges();
            }, { once: true });
        } else {
            this.challenges = this.challenges.filter(c => c.id !== id);
            this.save();
            this.renderChallenges();
        }
    }

    // ─── Join Challenge (from invite link) ────────────────────

    /**
     * Process an incoming invite link and join the challenge.
     * @param {Object} inviteData - Decoded invite data
     */
    joinChallenge(inviteData) {
        // Check if challenge already exists locally
        let existing = this.challenges.find(c => c.id === inviteData.id);

        if (existing) {
            // Already joined — just show it
            this.setView('challenges');
            return;
        }

        // Prompt for name (use stored name or ask)
        let joinerName = this.userName;
        if (!joinerName) {
            joinerName = prompt('Enter your display name to join this challenge:');
            if (!joinerName || !joinerName.trim()) return;
            joinerName = joinerName.trim();
            this.userName = joinerName;
        }

        const stats = this.todoManager.getStats();

        // Create local challenge record
        const challenge = {
            id: inviteData.id,
            name: inviteData.name,
            creatorName: inviteData.creator,
            duration: inviteData.duration,
            goal: inviteData.goal || null,
            startTime: inviteData.startTime,
            endTime: inviteData.startTime + (inviteData.duration * 24 * 60 * 60 * 1000),
            participants: [
                {
                    name: inviteData.creator,
                    isCreator: true,
                    tasksAtStart: inviteData.creatorTasksAtStart || 0,
                    tasksCompleted: 0,
                    lastUpdated: inviteData.startTime
                },
                {
                    name: joinerName,
                    isCreator: false,
                    tasksAtStart: stats.completed,
                    tasksCompleted: 0,
                    lastUpdated: Date.now()
                }
            ]
        };

        this.challenges.unshift(challenge);
        this.save();
        this.setView('challenges');

        // Clean URL
        this._clearUrlParams();
    }

    // ─── Progress Sharing ─────────────────────────────────────

    /**
     * Process incoming progress update from a URL.
     * @param {Object} progressData - Decoded progress data
     */
    receiveProgress(progressData) {
        const challenge = this.challenges.find(c => c.id === progressData.challengeId);
        if (!challenge) {
            // Challenge not found locally — ignore silently
            this._clearUrlParams();
            return;
        }

        // Find or add participant
        let participant = challenge.participants.find(
            p => p.name.toLowerCase() === progressData.name.toLowerCase()
        );

        if (participant) {
            // Update existing
            participant.tasksCompleted = progressData.tasksCompleted;
            participant.lastUpdated = progressData.timestamp;
        } else {
            // Add new participant
            challenge.participants.push({
                name: progressData.name,
                isCreator: false,
                tasksAtStart: progressData.tasksAtStart || 0,
                tasksCompleted: progressData.tasksCompleted,
                lastUpdated: progressData.timestamp
            });
        }

        this.save();
        this._clearUrlParams();

        // Show leaderboard for this challenge
        this.leaderboardSelect.value = challenge.id;
        this.setView('leaderboard');
        this.renderLeaderboard(challenge.id);
    }

    /**
     * Get current user's progress for a specific challenge.
     * @param {string} challengeId
     * @returns {number}
     */
    getMyProgress(challengeId) {
        const challenge = this.challenges.find(c => c.id === challengeId);
        if (!challenge) return 0;

        const me = challenge.participants.find(
            p => p.name.toLowerCase() === this.userName.toLowerCase()
        );
        if (!me) return 0;

        // Calculate tasks completed since challenge started
        const currentCompleted = this.todoManager.getStats().completed;
        const progress = Math.max(0, currentCompleted - me.tasksAtStart);
        return progress;
    }

    /**
     * Update own progress in a challenge (called periodically or on demand).
     * @param {string} challengeId
     */
    updateMyProgress(challengeId) {
        const challenge = this.challenges.find(c => c.id === challengeId);
        if (!challenge) return;

        const me = challenge.participants.find(
            p => p.name.toLowerCase() === this.userName.toLowerCase()
        );
        if (!me) return;

        const currentCompleted = this.todoManager.getStats().completed;
        me.tasksCompleted = Math.max(0, currentCompleted - me.tasksAtStart);
        me.lastUpdated = Date.now();
        this.save();
    }

    // ─── Link Generation ──────────────────────────────────────

    /**
     * Generate an invite link for a challenge.
     * @param {string} challengeId
     * @returns {string}
     */
    generateInviteLink(challengeId) {
        const challenge = this.challenges.find(c => c.id === challengeId);
        if (!challenge) return '';

        const creator = challenge.participants.find(p => p.isCreator);
        const data = {
            id: challenge.id,
            name: challenge.name,
            creator: challenge.creatorName,
            duration: challenge.duration,
            goal: challenge.goal,
            startTime: challenge.startTime,
            creatorTasksAtStart: creator ? creator.tasksAtStart : 0
        };

        const encoded = btoa(encodeURIComponent(JSON.stringify(data)));
        const baseUrl = window.location.origin + window.location.pathname;
        return `${baseUrl}?${CompetitionManager.PARAM_INVITE}=${encoded}`;
    }

    /**
     * Generate a progress sharing link.
     * @param {string} challengeId
     * @returns {string}
     */
    generateProgressLink(challengeId) {
        const challenge = this.challenges.find(c => c.id === challengeId);
        if (!challenge) return '';

        // Update own progress first
        this.updateMyProgress(challengeId);

        const me = challenge.participants.find(
            p => p.name.toLowerCase() === this.userName.toLowerCase()
        );
        if (!me) return '';

        const data = {
            challengeId: challenge.id,
            name: me.name,
            tasksCompleted: me.tasksCompleted,
            tasksAtStart: me.tasksAtStart,
            timestamp: Date.now()
        };

        const encoded = btoa(encodeURIComponent(JSON.stringify(data)));
        const baseUrl = window.location.origin + window.location.pathname;
        return `${baseUrl}?${CompetitionManager.PARAM_PROGRESS}=${encoded}`;
    }

    // ─── UI Actions ───────────────────────────────────────────

    /**
     * Show the invite link for a challenge.
     * @param {string} challengeId
     */
    showInviteLink(challengeId) {
        const link = this.generateInviteLink(challengeId);
        if (!link) return;

        this.inviteLinkInput.value = link;
        this.inviteDisplay.classList.remove('hidden');
        this.inviteCopiedMsg.classList.add('hidden');
        this.shareDisplay.classList.add('hidden');
    }

    /**
     * Show the share progress link.
     * @param {string} challengeId
     */
    showShareProgress(challengeId) {
        const link = this.generateProgressLink(challengeId);
        if (!link) return;

        this.shareLinkInput.value = link;
        this.shareDisplay.classList.remove('hidden');
        this.shareCopiedMsg.classList.add('hidden');
        this.inviteDisplay.classList.add('hidden');
    }

    // ─── Rendering ────────────────────────────────────────────

    /**
     * Render the current view.
     */
    renderView() {
        if (this.currentView === 'challenges') {
            this.renderChallenges();
        } else if (this.currentView === 'leaderboard') {
            this._populateLeaderboardSelect();
        }
    }

    /**
     * Render the challenges list.
     */
    renderChallenges() {
        this.challengesList.innerHTML = '';

        if (this.challenges.length === 0) {
            this.challengesEmpty.classList.remove('hidden');
            return;
        }

        this.challengesEmpty.classList.add('hidden');

        this.challenges.forEach(challenge => {
            // Update own progress
            this.updateMyProgress(challenge.id);

            const card = document.createElement('div');
            card.className = 'comp-challenge-card';
            card.dataset.id = challenge.id;

            const isActive = Date.now() < challenge.endTime;
            const timeLeft = this._getTimeRemaining(challenge.endTime);
            const statusClass = isActive ? 'comp-status--active' : 'comp-status--ended';
            const statusText = isActive ? `⏱ ${timeLeft}` : '🏁 Ended';

            // Get own progress
            const myProgress = this.getMyProgress(challenge.id);
            const goalHtml = challenge.goal
                ? `<div class="comp-challenge__progress-bar">
                       <div class="comp-challenge__progress-fill" style="width: ${Math.min(100, (myProgress / challenge.goal) * 100)}%"></div>
                   </div>
                   <span class="comp-challenge__progress-text">${myProgress}/${challenge.goal} tasks</span>`
                : `<span class="comp-challenge__progress-text">${myProgress} tasks completed</span>`;

            card.innerHTML = `
                <div class="comp-challenge__top">
                    <div class="comp-challenge__info">
                        <h3 class="comp-challenge__name">${this._escapeHtml(challenge.name)}</h3>
                        <span class="comp-challenge__meta">
                            by ${this._escapeHtml(challenge.creatorName)} · ${challenge.participants.length} participant${challenge.participants.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                    <span class="comp-challenge__status ${statusClass}">${statusText}</span>
                </div>
                <div class="comp-challenge__progress">
                    ${goalHtml}
                </div>
                <div class="comp-challenge__actions">
                    <button class="comp-challenge__btn comp-challenge__btn--invite" title="Get invite link">🔗 Invite</button>
                    <button class="comp-challenge__btn comp-challenge__btn--share" title="Share your progress">📊 Share Progress</button>
                    <button class="comp-challenge__btn comp-challenge__btn--leaderboard" title="View leaderboard">🏆 Board</button>
                    <button class="comp-challenge__btn comp-challenge__btn--delete" title="Remove challenge">🗑️</button>
                </div>
            `;

            this.challengesList.appendChild(card);
        });
    }

    /**
     * Render the leaderboard for a specific challenge.
     * @param {string} challengeId
     */
    renderLeaderboard(challengeId) {
        if (!challengeId) {
            this.leaderboardEl.innerHTML = '';
            this.leaderboardEmpty.classList.remove('hidden');
            return;
        }

        const challenge = this.challenges.find(c => c.id === challengeId);
        if (!challenge) {
            this.leaderboardEl.innerHTML = '';
            this.leaderboardEmpty.classList.remove('hidden');
            return;
        }

        this.leaderboardEmpty.classList.add('hidden');

        // Update own progress
        this.updateMyProgress(challengeId);

        // Sort participants by tasks completed (desc)
        const sorted = [...challenge.participants].sort(
            (a, b) => b.tasksCompleted - a.tasksCompleted
        );

        let html = `
            <div class="comp-leaderboard__header">
                <h3 class="comp-leaderboard__title">${this._escapeHtml(challenge.name)}</h3>
                ${challenge.goal ? `<span class="comp-leaderboard__goal">Goal: ${challenge.goal} tasks</span>` : ''}
            </div>
            <div class="comp-leaderboard__table">
                <div class="comp-leaderboard__row comp-leaderboard__row--header">
                    <span class="comp-leaderboard__rank">#</span>
                    <span class="comp-leaderboard__name">Participant</span>
                    <span class="comp-leaderboard__score">Tasks Done</span>
                    <span class="comp-leaderboard__updated">Last Updated</span>
                </div>
        `;

        sorted.forEach((p, index) => {
            const rank = index + 1;
            const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}`;
            const isMe = p.name.toLowerCase() === this.userName.toLowerCase();
            const rowClass = isMe ? 'comp-leaderboard__row comp-leaderboard__row--me' : 'comp-leaderboard__row';
            const lastUpdated = this._timeAgo(p.lastUpdated);

            // Progress vs goal
            let progressHtml = `${p.tasksCompleted}`;
            if (challenge.goal) {
                const pct = Math.min(100, (p.tasksCompleted / challenge.goal) * 100);
                progressHtml = `
                    <div class="comp-leaderboard__bar-container">
                        <div class="comp-leaderboard__bar" style="width: ${pct}%"></div>
                    </div>
                    <span>${p.tasksCompleted}/${challenge.goal}</span>
                `;
            }

            html += `
                <div class="${rowClass}">
                    <span class="comp-leaderboard__rank">${medal}</span>
                    <span class="comp-leaderboard__name">${this._escapeHtml(p.name)}${isMe ? ' (you)' : ''}${p.isCreator ? ' 👑' : ''}</span>
                    <span class="comp-leaderboard__score">${progressHtml}</span>
                    <span class="comp-leaderboard__updated">${lastUpdated}</span>
                </div>
            `;
        });

        html += '</div>';

        this.leaderboardEl.innerHTML = html;
    }

    /**
     * Populate leaderboard challenge dropdown.
     * @private
     */
    _populateLeaderboardSelect() {
        // Preserve current selection
        const currentVal = this.leaderboardSelect.value;

        this.leaderboardSelect.innerHTML = '<option value="">— Choose a challenge —</option>';
        this.challenges.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = c.name;
            this.leaderboardSelect.appendChild(opt);
        });

        // Restore selection if it still exists
        if (currentVal && this.challenges.find(c => c.id === currentVal)) {
            this.leaderboardSelect.value = currentVal;
            this.renderLeaderboard(currentVal);
        } else if (this.challenges.length === 0) {
            this.leaderboardEmpty.classList.remove('hidden');
            this.leaderboardEl.innerHTML = '';
        }
    }

    // ─── URL Processing ───────────────────────────────────────

    /**
     * Check URL for invite or progress parameters and process them.
     * @private
     */
    _processUrlParams() {
        const params = new URLSearchParams(window.location.search);

        // Check for invite link
        const inviteParam = params.get(CompetitionManager.PARAM_INVITE);
        if (inviteParam) {
            try {
                const decoded = JSON.parse(decodeURIComponent(atob(inviteParam)));
                if (decoded && decoded.id && decoded.name) {
                    this.joinChallenge(decoded);
                }
            } catch (e) {
                console.warn('CompetitionManager: Invalid invite link', e);
            }
            return;
        }

        // Check for progress update
        const progressParam = params.get(CompetitionManager.PARAM_PROGRESS);
        if (progressParam) {
            try {
                const decoded = JSON.parse(decodeURIComponent(atob(progressParam)));
                if (decoded && decoded.challengeId && decoded.name) {
                    this.receiveProgress(decoded);
                }
            } catch (e) {
                console.warn('CompetitionManager: Invalid progress link', e);
            }
        }
    }

    /**
     * Clear URL parameters without reloading.
     * @private
     */
    _clearUrlParams() {
        const url = window.location.origin + window.location.pathname;
        window.history.replaceState({}, '', url);
    }

    // ─── Persistence ──────────────────────────────────────────

    /**
     * Save state to localStorage.
     */
    save() {
        try {
            localStorage.setItem('competition_data', JSON.stringify({
                challenges: this.challenges,
                userName: this.userName
            }));
        } catch (e) {
            console.warn('CompetitionManager: Failed to save.', e);
        }
    }

    /**
     * Load state from localStorage.
     */
    load() {
        try {
            const data = localStorage.getItem('competition_data');
            if (data) {
                const parsed = JSON.parse(data);
                this.challenges = Array.isArray(parsed.challenges) ? parsed.challenges : [];
                this.userName = parsed.userName || '';
            }
        } catch (e) {
            console.warn('CompetitionManager: Failed to load.', e);
            this.challenges = [];
            this.userName = '';
        }
    }

    // ─── Utility Methods ──────────────────────────────────────

    /**
     * Copy text to clipboard and show feedback.
     * @param {string} text
     * @param {HTMLElement} feedbackEl
     * @private
     */
    _copyToClipboard(text, feedbackEl) {
        navigator.clipboard.writeText(text).then(() => {
            feedbackEl.classList.remove('hidden');
            setTimeout(() => feedbackEl.classList.add('hidden'), 2500);
        }).catch(() => {
            // Fallback: select the input
            const input = feedbackEl.previousElementSibling?.querySelector('input');
            if (input) {
                input.select();
                document.execCommand('copy');
                feedbackEl.classList.remove('hidden');
                setTimeout(() => feedbackEl.classList.add('hidden'), 2500);
            }
        });
    }

    /**
     * Get human-readable time remaining.
     * @param {number} endTime
     * @returns {string}
     * @private
     */
    _getTimeRemaining(endTime) {
        const diff = endTime - Date.now();
        if (diff <= 0) return 'Ended';

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

        if (days > 0) return `${days}d ${hours}h left`;
        if (hours > 0) return `${hours}h left`;

        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return `${mins}m left`;
    }

    /**
     * Get human-readable "time ago" string.
     * @param {number} timestamp
     * @returns {string}
     * @private
     */
    _timeAgo(timestamp) {
        const diff = Date.now() - timestamp;
        const mins = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (mins < 1) return 'just now';
        if (mins < 60) return `${mins}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 30) return `${days}d ago`;
        return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    /**
     * Generate unique ID.
     * @returns {string}
     * @private
     */
    _generateId() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    }

    /**
     * Escape HTML.
     * @param {string} str
     * @returns {string}
     * @private
     */
    _escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
}
