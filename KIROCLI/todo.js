/* ============================================================
   TODO.JS — Formal To-Do List Manager
   Full CRUD with archive and soft-delete (trash) functionality.
   Three views: Active, Archived, Trash.
   Notion-inspired task management with localStorage persistence.
   ============================================================ */

class TodoManager {
    /** View constants */
    static VIEW_ACTIVE = 'active';
    static VIEW_ARCHIVED = 'archived';
    static VIEW_TRASH = 'trash';

    /** Filter constants (within active view) */
    static FILTER_ALL = 'all';
    static FILTER_PENDING = 'pending';
    static FILTER_COMPLETED = 'completed';

    /**
     * @param {TokenManager} tokenManager - Reference to token system
     */
    constructor(tokenManager) {
        /** @type {TokenManager} */
        this.tokenManager = tokenManager;

        /** @type {Array<Object>} All tasks (active + archived + trashed) */
        this.tasks = [];

        /** @type {string} Current view */
        this.currentView = TodoManager.VIEW_ACTIVE;

        /** @type {string} Current filter within active view */
        this.currentFilter = TodoManager.FILTER_ALL;

        // DOM references
        this.form = document.getElementById('todo-form');
        this.input = document.getElementById('todo-input');
        this.prioritySelect = document.getElementById('todo-priority');
        this.dueDateInput = document.getElementById('todo-due-date');
        this.listEl = document.getElementById('todo-list');
        this.emptyEl = document.getElementById('todo-empty');
        this.filtersEl = document.getElementById('todo-filters');
        this.filterBtns = document.querySelectorAll('.todo-filters__btn');
        this.tabBtns = document.querySelectorAll('.todo-tabs__btn');
        this.bulkActionsEl = document.getElementById('todo-bulk-actions');
        this.bulkRestoreBtn = document.getElementById('bulk-restore-btn');
        this.bulkDeleteBtn = document.getElementById('bulk-delete-btn');
        this.viewCountEl = document.getElementById('todo-view-count');

        // Stats elements
        this.statsTotal = document.getElementById('todo-stats-total');
        this.statsCompleted = document.getElementById('todo-stats-completed');
        this.statsRemaining = document.getElementById('todo-stats-remaining');

        // Load tasks from localStorage
        this.loadTasks();

        // Bind events
        this._bindEvents();

        // Initial render
        this.renderView();
    }

    // ─── Event Binding ────────────────────────────────────────

    /** @private */
    _bindEvents() {
        // Form submission — add new task
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            const text = this.input.value.trim();
            if (text) {
                this.addTask(text, this.prioritySelect.value, this.dueDateInput.value);
                this.input.value = '';
                this.dueDateInput.value = '';
                this.input.focus();
            }
        });

        // View tabs
        this.tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.setView(btn.dataset.view);
            });
        });

        // Filter buttons
        this.filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.setFilter(btn.dataset.filter);
            });
        });

        // Bulk actions
        this.bulkRestoreBtn.addEventListener('click', () => {
            this.restoreAll();
        });

        this.bulkDeleteBtn.addEventListener('click', () => {
            if (this.currentView === TodoManager.VIEW_TRASH) {
                this.emptyTrash();
            } else if (this.currentView === TodoManager.VIEW_ARCHIVED) {
                this.deleteAllArchived();
            }
        });

        // Event delegation on task list
        this.listEl.addEventListener('click', (e) => {
            const taskEl = e.target.closest('.task-item');
            if (!taskEl) return;
            const id = taskEl.dataset.id;

            // Checkbox toggle
            if (e.target.classList.contains('task-item__checkbox')) {
                this.toggleComplete(id);
                return;
            }

            // Edit button
            if (e.target.closest('.task-item__btn--edit')) {
                this.startEditing(id, taskEl);
                return;
            }

            // Archive button
            if (e.target.closest('.task-item__btn--archive')) {
                this.archiveTask(id, taskEl);
                return;
            }

            // Delete (move to trash) button
            if (e.target.closest('.task-item__btn--delete')) {
                this.trashTask(id, taskEl);
                return;
            }

            // Restore button
            if (e.target.closest('.task-item__btn--restore')) {
                this.restoreTask(id, taskEl);
                return;
            }

            // Permanent delete button
            if (e.target.closest('.task-item__btn--perma-delete')) {
                this.permanentlyDelete(id, taskEl);
                return;
            }
        });
    }

    // ─── View Management ──────────────────────────────────────

    /**
     * Switch between Active, Archived, and Trash views.
     * @param {string} view
     */
    setView(view) {
        this.currentView = view;

        // Update tab styles
        this.tabBtns.forEach(btn => {
            const isActive = btn.dataset.view === view;
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-selected', isActive.toString());
        });

        // Show/hide form and filters based on view
        if (view === TodoManager.VIEW_ACTIVE) {
            this.form.classList.remove('hidden');
            this.filtersEl.classList.remove('hidden');
            this.bulkActionsEl.classList.add('hidden');
        } else {
            this.form.classList.add('hidden');
            this.filtersEl.classList.add('hidden');
            this.bulkActionsEl.classList.remove('hidden');

            // Customize bulk delete button text
            if (view === TodoManager.VIEW_TRASH) {
                this.bulkDeleteBtn.textContent = '⚠️ Empty Trash';
            } else {
                this.bulkDeleteBtn.textContent = '⚠️ Delete All Permanently';
            }
        }

        this.renderView();
    }

    /**
     * Set filter within the active view.
     * @param {string} filter
     */
    setFilter(filter) {
        this.currentFilter = filter;
        this.filterBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });
        this.renderView();
    }

    // ─── CRUD Operations ──────────────────────────────────────

    /**
     * Create a new task.
     * @param {string} text - Task description
     * @param {string} priority - 'low', 'medium', or 'high'
     * @param {string} dueDate - Optional due date (ISO string)
     */
    addTask(text, priority = 'medium', dueDate = '') {
        const task = {
            id: this._generateId(),
            text,
            priority,
            completed: false,
            dueDate: dueDate || null,
            status: 'active', // 'active', 'archived', 'trashed'
            createdAt: Date.now(),
            updatedAt: Date.now(),
            completedAt: null,
            archivedAt: null,
            trashedAt: null
        };

        this.tasks.unshift(task);
        this.saveTasks();
        this.renderView();
    }

    /**
     * Update a task's text.
     * @param {string} id
     * @param {string} newText
     */
    editTask(id, newText) {
        const task = this.tasks.find(t => t.id === id);
        if (!task) return;

        const trimmed = newText.trim();
        if (trimmed && trimmed !== task.text) {
            task.text = trimmed;
            task.updatedAt = Date.now();
            this.saveTasks();
        }
        this.renderView();
    }

    /**
     * Update a task's priority.
     * @param {string} id
     * @param {string} newPriority
     */
    editTaskPriority(id, newPriority) {
        const task = this.tasks.find(t => t.id === id);
        if (!task) return;

        task.priority = newPriority;
        task.updatedAt = Date.now();
        this.saveTasks();
        this.renderView();
    }

    /**
     * Update a task's due date.
     * @param {string} id
     * @param {string} newDate
     */
    editTaskDueDate(id, newDate) {
        const task = this.tasks.find(t => t.id === id);
        if (!task) return;

        task.dueDate = newDate || null;
        task.updatedAt = Date.now();
        this.saveTasks();
        this.renderView();
    }

    /**
     * Toggle task completion.
     * Awards token via TokenManager when completing.
     * @param {string} id
     */
    toggleComplete(id) {
        const task = this.tasks.find(t => t.id === id);
        if (!task || task.status !== 'active') return;

        const wasCompleted = task.completed;
        task.completed = !task.completed;
        task.updatedAt = Date.now();
        task.completedAt = task.completed ? Date.now() : null;

        // Only award token when marking complete, not uncompleting
        if (!wasCompleted && task.completed) {
            this.tokenManager.onTaskCompleted();
        }

        this.saveTasks();
        this.renderView();
    }

    /**
     * Move task to archive.
     * @param {string} id
     * @param {HTMLElement} [taskEl]
     */
    archiveTask(id, taskEl) {
        const task = this.tasks.find(t => t.id === id);
        if (!task) return;

        if (taskEl) {
            taskEl.classList.add('task-exit');
            taskEl.addEventListener('animationend', () => {
                task.status = 'archived';
                task.archivedAt = Date.now();
                task.updatedAt = Date.now();
                this.saveTasks();
                this.renderView();
            }, { once: true });
        } else {
            task.status = 'archived';
            task.archivedAt = Date.now();
            task.updatedAt = Date.now();
            this.saveTasks();
            this.renderView();
        }
    }

    /**
     * Move task to trash (soft delete).
     * @param {string} id
     * @param {HTMLElement} [taskEl]
     */
    trashTask(id, taskEl) {
        const task = this.tasks.find(t => t.id === id);
        if (!task) return;

        if (taskEl) {
            taskEl.classList.add('task-exit');
            taskEl.addEventListener('animationend', () => {
                task.status = 'trashed';
                task.trashedAt = Date.now();
                task.updatedAt = Date.now();
                this.saveTasks();
                this.renderView();
            }, { once: true });
        } else {
            task.status = 'trashed';
            task.trashedAt = Date.now();
            task.updatedAt = Date.now();
            this.saveTasks();
            this.renderView();
        }
    }

    /**
     * Restore a task from archive or trash back to active.
     * @param {string} id
     * @param {HTMLElement} [taskEl]
     */
    restoreTask(id, taskEl) {
        const task = this.tasks.find(t => t.id === id);
        if (!task) return;

        if (taskEl) {
            taskEl.classList.add('task-exit');
            taskEl.addEventListener('animationend', () => {
                task.status = 'active';
                task.archivedAt = null;
                task.trashedAt = null;
                task.updatedAt = Date.now();
                this.saveTasks();
                this.renderView();
            }, { once: true });
        } else {
            task.status = 'active';
            task.archivedAt = null;
            task.trashedAt = null;
            task.updatedAt = Date.now();
            this.saveTasks();
            this.renderView();
        }
    }

    /**
     * Permanently delete a task (irreversible).
     * @param {string} id
     * @param {HTMLElement} [taskEl]
     */
    permanentlyDelete(id, taskEl) {
        if (taskEl) {
            taskEl.classList.add('task-exit');
            taskEl.addEventListener('animationend', () => {
                this.tasks = this.tasks.filter(t => t.id !== id);
                this.saveTasks();
                this.renderView();
            }, { once: true });
        } else {
            this.tasks = this.tasks.filter(t => t.id !== id);
            this.saveTasks();
            this.renderView();
        }
    }

    // ─── Bulk Operations ──────────────────────────────────────

    /**
     * Restore all tasks in the current view back to active.
     */
    restoreAll() {
        const statusToRestore = this.currentView === TodoManager.VIEW_ARCHIVED ? 'archived' : 'trashed';
        this.tasks.forEach(t => {
            if (t.status === statusToRestore) {
                t.status = 'active';
                t.archivedAt = null;
                t.trashedAt = null;
                t.updatedAt = Date.now();
            }
        });
        this.saveTasks();
        this.renderView();
    }

    /**
     * Permanently delete all tasks in trash.
     */
    emptyTrash() {
        this.tasks = this.tasks.filter(t => t.status !== 'trashed');
        this.saveTasks();
        this.renderView();
    }

    /**
     * Permanently delete all archived tasks.
     */
    deleteAllArchived() {
        this.tasks = this.tasks.filter(t => t.status !== 'archived');
        this.saveTasks();
        this.renderView();
    }

    // ─── Inline Editing ───────────────────────────────────────

    /**
     * Start inline editing mode for a task.
     * @param {string} id
     * @param {HTMLElement} taskEl
     */
    startEditing(id, taskEl) {
        const task = this.tasks.find(t => t.id === id);
        if (!task) return;

        const textSpan = taskEl.querySelector('.task-item__text');
        if (!textSpan) return;

        // Replace text span with input
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'task-item__edit-input';
        input.value = task.text;
        input.setAttribute('aria-label', 'Edit task');

        textSpan.replaceWith(input);
        input.focus();
        input.select();

        const save = () => {
            this.editTask(id, input.value);
        };

        const cancel = () => {
            this.renderView();
        };

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                save();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                cancel();
            }
        });

        input.addEventListener('blur', save, { once: true });
    }

    // ─── Rendering ────────────────────────────────────────────

    /**
     * Render the current view with appropriate tasks.
     */
    renderView() {
        const tasks = this._getVisibleTasks();
        this.listEl.innerHTML = '';

        if (tasks.length === 0) {
            this.emptyEl.classList.remove('hidden');
            this._updateEmptyState();
        } else {
            this.emptyEl.classList.add('hidden');
        }

        tasks.forEach(task => {
            const li = this._createTaskElement(task);
            this.listEl.appendChild(li);
        });

        this.updateStats();
        this._updateViewCount();
    }

    /**
     * Get tasks visible in the current view + filter.
     * @returns {Array<Object>}
     * @private
     */
    _getVisibleTasks() {
        let filtered;

        switch (this.currentView) {
            case TodoManager.VIEW_ACTIVE:
                filtered = this.tasks.filter(t => t.status === 'active');
                // Apply sub-filter
                if (this.currentFilter === TodoManager.FILTER_PENDING) {
                    filtered = filtered.filter(t => !t.completed);
                } else if (this.currentFilter === TodoManager.FILTER_COMPLETED) {
                    filtered = filtered.filter(t => t.completed);
                }
                break;
            case TodoManager.VIEW_ARCHIVED:
                filtered = this.tasks.filter(t => t.status === 'archived');
                break;
            case TodoManager.VIEW_TRASH:
                filtered = this.tasks.filter(t => t.status === 'trashed');
                break;
            default:
                filtered = [];
        }

        return filtered;
    }

    /**
     * Create a task DOM element based on the current view.
     * @param {Object} task
     * @returns {HTMLLIElement}
     * @private
     */
    _createTaskElement(task) {
        const li = document.createElement('li');
        li.className = `task-item${task.completed ? ' completed' : ''}`;
        li.dataset.id = task.id;

        // Check if task is overdue
        const isOverdue = task.dueDate && !task.completed && new Date(task.dueDate) < new Date();
        if (isOverdue) {
            li.classList.add('overdue');
        }

        let actionsHtml = '';

        if (this.currentView === TodoManager.VIEW_ACTIVE) {
            actionsHtml = `
                <button class="task-item__btn task-item__btn--edit" aria-label="Edit task" title="Edit">✏️</button>
                <button class="task-item__btn task-item__btn--archive" aria-label="Archive task" title="Archive">📦</button>
                <button class="task-item__btn task-item__btn--delete" aria-label="Move to trash" title="Delete">🗑️</button>
            `;
        } else if (this.currentView === TodoManager.VIEW_ARCHIVED) {
            actionsHtml = `
                <button class="task-item__btn task-item__btn--restore" aria-label="Restore task" title="Restore">↩️</button>
                <button class="task-item__btn task-item__btn--perma-delete" aria-label="Delete permanently" title="Delete permanently">❌</button>
            `;
        } else if (this.currentView === TodoManager.VIEW_TRASH) {
            actionsHtml = `
                <button class="task-item__btn task-item__btn--restore" aria-label="Restore task" title="Restore">↩️</button>
                <button class="task-item__btn task-item__btn--perma-delete" aria-label="Delete permanently" title="Delete permanently">❌</button>
            `;
        }

        // Due date display
        let dueDateHtml = '';
        if (task.dueDate) {
            const dateObj = new Date(task.dueDate + 'T00:00:00');
            const formatted = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const dueDateClass = isOverdue ? 'task-item__due-date overdue' : 'task-item__due-date';
            dueDateHtml = `<span class="${dueDateClass}">📅 ${formatted}</span>`;
        }

        // Metadata line (created/archived/trashed date)
        let metaHtml = '';
        if (this.currentView === TodoManager.VIEW_ARCHIVED && task.archivedAt) {
            const date = new Date(task.archivedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            metaHtml = `<span class="task-item__meta">Archived ${date}</span>`;
        } else if (this.currentView === TodoManager.VIEW_TRASH && task.trashedAt) {
            const date = new Date(task.trashedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            metaHtml = `<span class="task-item__meta">Deleted ${date}</span>`;
        }

        // Checkbox only for active view
        const checkboxHtml = this.currentView === TodoManager.VIEW_ACTIVE
            ? `<input type="checkbox" class="task-item__checkbox" ${task.completed ? 'checked' : ''} aria-label="Mark task ${task.completed ? 'incomplete' : 'complete'}">`
            : '';

        li.innerHTML = `
            ${checkboxHtml}
            <div class="task-item__content">
                <span class="task-item__text">${this._escapeHtml(task.text)}</span>
                <div class="task-item__details">
                    <span class="task-item__priority task-item__priority--${task.priority}">${task.priority}</span>
                    ${dueDateHtml}
                    ${metaHtml}
                </div>
            </div>
            <div class="task-item__actions">
                ${actionsHtml}
            </div>
        `;

        return li;
    }

    // ─── Stats & UI Updates ───────────────────────────────────

    /**
     * Update the stats counter display (always shows active view stats).
     */
    updateStats() {
        const stats = this.getStats();
        this.statsTotal.textContent = `${stats.total} total`;
        this.statsCompleted.textContent = `${stats.completed} done`;
        this.statsRemaining.textContent = `${stats.remaining} pending`;
    }

    /**
     * Get task statistics for active tasks.
     * @returns {{ total: number, completed: number, remaining: number }}
     */
    getStats() {
        const activeTasks = this.tasks.filter(t => t.status === 'active');
        const total = activeTasks.length;
        const completed = activeTasks.filter(t => t.completed).length;
        return {
            total,
            completed,
            remaining: total - completed
        };
    }

    /**
     * Update view count badge in header.
     * @private
     */
    _updateViewCount() {
        const tasks = this._getVisibleTasks();
        this.viewCountEl.textContent = tasks.length > 0 ? `${tasks.length}` : '';
    }

    /**
     * Update empty state message based on current view.
     * @private
     */
    _updateEmptyState() {
        const icon = this.emptyEl.querySelector('.todo-empty__icon');
        const text = this.emptyEl.querySelector('.todo-empty__text');

        switch (this.currentView) {
            case TodoManager.VIEW_ACTIVE:
                icon.textContent = '📝';
                if (this.currentFilter === TodoManager.FILTER_COMPLETED) {
                    text.textContent = 'No completed tasks yet';
                } else if (this.currentFilter === TodoManager.FILTER_PENDING) {
                    text.textContent = 'All tasks are done! 🎉';
                } else {
                    text.textContent = 'No tasks yet. Add one above!';
                }
                break;
            case TodoManager.VIEW_ARCHIVED:
                icon.textContent = '📦';
                text.textContent = 'No archived tasks';
                break;
            case TodoManager.VIEW_TRASH:
                icon.textContent = '🗑️';
                text.textContent = 'Trash is empty';
                break;
        }
    }

    // ─── localStorage Persistence ─────────────────────────────

    /**
     * Save tasks to localStorage.
     */
    saveTasks() {
        try {
            localStorage.setItem('todo_tasks', JSON.stringify(this.tasks));
        } catch (e) {
            console.warn('TodoManager: Failed to save tasks.', e);
        }
    }

    /**
     * Load tasks from localStorage.
     * Migrates old format (no status field) to new format.
     */
    loadTasks() {
        try {
            const data = localStorage.getItem('todo_tasks');
            if (data) {
                const parsed = JSON.parse(data);
                if (Array.isArray(parsed)) {
                    // Migrate old tasks that don't have a status field
                    this.tasks = parsed.map(t => {
                        if (!t.status) {
                            return {
                                ...t,
                                status: 'active',
                                dueDate: t.dueDate || null,
                                updatedAt: t.updatedAt || t.createdAt || Date.now(),
                                completedAt: t.completed ? (t.completedAt || Date.now()) : null,
                                archivedAt: null,
                                trashedAt: null
                            };
                        }
                        return t;
                    });
                } else {
                    this.tasks = [];
                }
            }
        } catch (e) {
            console.warn('TodoManager: Failed to load tasks, starting fresh.', e);
            this.tasks = [];
        }
    }

    // ─── Utilities ────────────────────────────────────────────

    /**
     * Generate a unique task ID.
     * @returns {string}
     * @private
     */
    _generateId() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    }

    /**
     * Escape HTML to prevent XSS.
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
