import '../scss/style.scss';
import { client } from './appwrite.js';
import { Store } from './modules/Store.js';
import { TaskItem } from './modules/TaskItem.js';
import { TrashTimer } from './modules/TrashTimer.js';
import { DragDrop } from './modules/DragDrop.js';
import { Tooltip } from './modules/Tooltip.js';
import { Skeleton } from './modules/Skeleton.js';
import { EditModal } from './modules/EditModal.js';

const MAX_CHARS = 1500;
const REALTIME_DEBOUNCE_MS = 300;
const TRASH_TIMER_INTERVAL_MS = 60 * 1000; // 1 minute

/**
 * ⏰ How long a completed task stays before auto-moving to Trash.
 * Testing: 3 minutes (3 * 60 * 1000 ms)
 * Production: 1 hour (60 * 60 * 1000 ms)
 */
const COMPLETION_AUTO_TRASH_MS = 3 * 60 * 1000; // 3 minutes for testing

class App {
	constructor() {
		this.taskInput = document.getElementById('task-input');
		this.addBtn = document.getElementById('add-btn');
		this.taskList = document.getElementById('task-list');
		this.miniLoader = document.getElementById('mini-loader');
		this.charCounter = document.getElementById('char-counter');
		this.charCount = document.getElementById('char-count');
		this.inputGroup = document.querySelector('.input-group');

		this.currentFilter = localStorage.getItem('todoFilter') || 'active';
		this._realtimeDebounceTimer = null;
		this._lottieContainer = null;
		this._lottieAnim = null;
		this._activeTaskItem = null;
		this._trashTimerInterval = null;
		this._completionTimerInterval = null;
		this._realtimeUnsubscribe = null;

		this.init();
	}

	async init() {
		await this.renderTasks(true); // true for initial load
		this.setupEventListeners();
		this.setupFilters();
		this.setupCharCounter();
		this.setupDragDrop();
		// Defer real-time subscription
		if ('requestIdleCallback' in window) {
			requestIdleCallback(() => this.setupRealtime());
		} else {
			setTimeout(() => this.setupRealtime(), 200);
		}
	}

	setupRealtime() {
		const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
		const COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_ID;

		// Subscribe to Appwrite Real-time document updates
		this._realtimeUnsubscribe = client.subscribe(
			`databases.${DATABASE_ID}.collections.${COLLECTION_ID}.documents`,
			(response) => {
				console.log('🔄 Appwrite Real-time event:', response.events);

				// Debounce rapid events
				clearTimeout(this._realtimeDebounceTimer);
				this._realtimeDebounceTimer = setTimeout(() => {
					this.renderTasks(false);
				}, REALTIME_DEBOUNCE_MS);
			}
		);

		console.log('✅ Subscribed to Appwrite Real-time updates');
	}

	showMiniLoader() {
		if (this.miniLoader) this.miniLoader.classList.add('active');
	}

	hideMiniLoader() {
		if (this.miniLoader) this.miniLoader.classList.remove('active');
	}

	setupEventListeners() {
		this.addBtn.addEventListener('click', () => this.addTask());
		this.taskInput.addEventListener('keypress', (e) => {
			if (e.key === 'Enter') {
				this.addTask();
			}
		});

		// Event delegation for task active-toggle (replaces per-item querySelectorAll)
		this.taskList.addEventListener('click', (e) => {
			const taskItem = e.target.closest('.task-item');
			if (!taskItem) return;
			// Ignore clicks on interactive sub-elements
			if (
				e.target.closest('.checkbox-container') ||
				e.target.closest('.delete-btn') ||
				e.target.closest('.edit-btn') ||
				e.target.closest('.expand-btn') ||
				e.target.closest('.restore-btn')
			)
				return;

			if (this._activeTaskItem && this._activeTaskItem !== taskItem) {
				this._activeTaskItem.classList.remove('active');
			}
			taskItem.classList.toggle('active');
			this._activeTaskItem = taskItem.classList.contains('active') ? taskItem : null;
		});
	}

	setupFilters() {
		this.filterBtns = document.querySelectorAll('.filter-btn');

		// Initialize active state based on currentFilter
		this.filterBtns.forEach((btn) => {
			if (btn.dataset.filter === this.currentFilter) {
				btn.classList.add('active');
			} else {
				btn.classList.remove('active');
			}
		});

		if (this.currentFilter !== 'all') {
			this.taskList.classList.add('filtered');
		}

		// Toggle input group visibility based on initial filter
		this._updateInputVisibility();

		this.filterBtns.forEach((btn) => {
			btn.addEventListener('click', () => {
				this.filterBtns.forEach((b) => b.classList.remove('active'));
				btn.classList.add('active');

				const prevFilter = this.currentFilter;
				this.currentFilter = btn.dataset.filter;
				localStorage.setItem('todoFilter', this.currentFilter);

				if (this.currentFilter === 'all') {
					this.taskList.classList.remove('filtered');
				} else {
					this.taskList.classList.add('filtered');
				}

				this._updateInputVisibility();

				// Always fetch when switching to/from trash (different data source)
				const needsFetch = this.currentFilter === 'trash' || prevFilter === 'trash';
				this.renderTasks(false, !needsFetch);
			});
		});
	}

	_updateInputVisibility() {
		if (this.inputGroup) {
			if (this.currentFilter === 'trash') {
				this.inputGroup.classList.add('hidden');
			} else {
				this.inputGroup.classList.remove('hidden');
			}
		}
	}

	setupCharCounter() {
		this.taskInput.addEventListener('focus', () => {
			this.charCounter.classList.add('visible');
			this.updateCharCount();
		});

		this.taskInput.addEventListener('blur', () => {
			if (this.taskInput.value.length === 0) {
				this.charCounter.classList.remove('visible');
			}
		});

		this.taskInput.addEventListener('input', () => {
			this.updateCharCount();
		});
	}

	updateCharCount() {
		const len = this.taskInput.value.length;
		this.charCount.textContent = len;

		this.charCounter.classList.remove('warning', 'error');
		if (len > MAX_CHARS) {
			this.charCounter.classList.add('error');
			// Show tooltip warning once when exceeding limit
			if (!this._limitWarningShown) {
				this._limitWarningShown = true;
				Tooltip.show({
					target: this.taskInput,
					message: `Character limit exceeded (${MAX_CHARS})! Shorten your text or submit as is.`,
					position: 'top',
					duration: 4000,
				});
			}
		} else {
			this._limitWarningShown = false;
			if (len >= MAX_CHARS * 0.9) {
				this.charCounter.classList.add('warning');
			}
		}
	}

	setupDragDrop() {
		new DragDrop(this.taskList, this.handleReorder.bind(this));
	}

	async addTask() {
		const taskText = this.taskInput.value.trim();

		if (taskText === '') {
			Tooltip.show({
				target: this.taskInput,
				message: 'Please enter a task!',
				position: 'top',
				duration: 3000,
			});
			this.taskInput.focus();
			return;
		}

		if (taskText.length > MAX_CHARS) {
			Tooltip.show({
				target: this.taskInput,
				message: `Too many characters! Reduce to ${MAX_CHARS} or fewer.`,
				position: 'top',
				duration: 3000,
			});
			this.taskInput.focus();
			return;
		}

		const newTask = {
			text: taskText,
			completed: false,
			createdAt: new Date().toISOString(),
		};

		this.showMiniLoader();
		await Store.addTask(newTask);
		await this.renderTasks(false);
		this.hideMiniLoader();
		this.taskInput.value = '';
		this.charCounter.classList.remove('visible', 'warning', 'error');
		this.charCount.textContent = '0';
		this.taskInput.focus();
	}

	async deleteTask(id) {
		this.showMiniLoader();
		await Store.deleteTask(id);
		await this.renderTasks(false);
		this.hideMiniLoader();
	}

	async restoreTask(id) {
		this.showMiniLoader();
		try {
			await Store.restoreTask(id);
			// Invalidate normal tasks cache so switching to All/Active/Done shows restored task
			this.tasks = null;
			await this.renderTasks(false);
		} catch (e) {
			console.error('Failed to restore task', e);
		}
		this.hideMiniLoader();
	}

	async permanentDeleteTask(id) {
		this.showMiniLoader();
		await Store.permanentDeleteTask(id);
		await this.renderTasks(false);
		this.hideMiniLoader();
	}

	async toggleTask(id, completed) {
		this.showMiniLoader();
		await Store.toggleTask(id, completed);
		await this.renderTasks(false);
		this.hideMiniLoader();

		// Show tooltip when marking as completed (completed was false, now true)
		if (!completed) {
			const taskEl = this.taskList.querySelector(`[data-id="${id}"]`);
			if (taskEl) {
				Tooltip.show({
					target: taskEl,
					message: 'Task will be moved to Trash in 3 minutes',
					position: 'top',
					duration: 3000,
				});
			}
		}
	}

	editTask(id, currentText, sourceElement) {
		EditModal.show({
			taskId: id,
			currentText,
			sourceElement,
			onSave: async (taskId, newText) => {
				this.showMiniLoader();
				try {
					await Store.updateTask(taskId, newText);
					// Full re-render to show 'was edited' indicator immediately
					await this.renderTasks(false);
				} catch (e) {
					console.error('Failed to edit task', e);
				}
				this.hideMiniLoader();
			},
		});
	}
	async handleReorder() {
		// We now allow reordering in filtered views too,
		// but it will only affect the relative order of visible items.

		// Scrape the DOM to get new order of IDs
		const tasksWithOrder = [];
		const currentOrderMap = new Map((this.tasks || []).map((t) => [t.id, t.order]));
		let hasChanges = false;

		this.taskList.querySelectorAll('.task-item').forEach((item, index) => {
			const id = item.dataset.id;
			const oldOrder = currentOrderMap.get(id);
			if (oldOrder !== index) {
				hasChanges = true;
			}
			tasksWithOrder.push({ id, order: index });
		});

		if (!hasChanges) {
			this.hideMiniLoader();
			return;
		}

		this.showMiniLoader();

		// Only send updates for tasks that actually changed position
		const changedTasks = tasksWithOrder.filter((t) => currentOrderMap.get(t.id) !== t.order);
		await Store.updateOrder(changedTasks);

		// Sync local cache so tab-switching doesn't revert to old order
		if (this.tasks) {
			const orderMap = new Map(tasksWithOrder.map((t) => [t.id, t.order]));
			this.tasks.forEach((t) => {
				if (orderMap.has(t.id)) t.order = orderMap.get(t.id);
			});
			this.tasks.sort((a, b) => a.order - b.order);
		}

		this.hideMiniLoader();
	}

	// --- Trash timer management ---
	_startTrashTimers() {
		this._stopTrashTimers();
		this._trashTimerInterval = setInterval(() => {
			// DOM-patch all visible timers without re-render
			const items = this.taskList.querySelectorAll('.task-item.in-trash');
			items.forEach((li) => {
				const timerEl = li.querySelector('.trash-timer');
				const deletedAt = li.dataset.deletedAt;
				if (timerEl && deletedAt) {
					TrashTimer.updateInPlace(timerEl, deletedAt);
				}
			});
		}, TRASH_TIMER_INTERVAL_MS);
	}

	_stopTrashTimers() {
		if (this._trashTimerInterval) {
			clearInterval(this._trashTimerInterval);
			this._trashTimerInterval = null;
		}
	}

	// --- Completion countdown timer management ---
	_startCompletionTimers() {
		this._stopCompletionTimers();
		this._completionTimerInterval = setInterval(() => {
			const COMPLETION_TTL = COMPLETION_AUTO_TRASH_MS;
			const items = this.taskList.querySelectorAll('.task-item.completed:not(.in-trash)');
			items.forEach((li) => {
				const completedAt = li.dataset.completedAt;
				const countdownEl = li.querySelector('.completion-countdown');
				if (countdownEl && completedAt) {
					const { label, remainingMs } = TrashTimer.computeProgress(completedAt, {
						ttl: COMPLETION_TTL,
					});
					countdownEl.textContent =
						remainingMs > 0 ? `\uD83D\uDDD1\uFE0F ${label}` : `\uD83D\uDDD1\uFE0F ...`;
				}
			});
		}, TRASH_TIMER_INTERVAL_MS);
	}

	_stopCompletionTimers() {
		if (this._completionTimerInterval) {
			clearInterval(this._completionTimerInterval);
			this._completionTimerInterval = null;
		}
	}

	async _ensureLottieContainer() {
		if (!this._lottieContainer) {
			this._lottieContainer = document.createElement('div');
			this._lottieContainer.className = 'no-tasks-container';

			const noTasksMsg = document.createElement('div');
			noTasksMsg.className = 'no-tasks-message';
			noTasksMsg.textContent = 'No tasks found';
			this._lottieContainer.appendChild(noTasksMsg);

			this._lottieCanvas = document.createElement('canvas');
			this._lottieCanvas.className = 'lottie-cat-animation';
			this._lottieContainer.appendChild(this._lottieCanvas);
		}

		// Destroy previous animation (invalidated by innerHTML = '')
		if (this._lottieAnim) {
			this._lottieAnim.destroy();
			this._lottieAnim = null;
		}

		// Dynamic import — Vite code-splits this into a separate chunk
		try {
			const { DotLottie } = await import('@lottiefiles/dotlottie-web');
			this._lottieAnim = new DotLottie({
				canvas: this._lottieCanvas,
				src: '/cat.lottie',
				loop: true,
				autoplay: true,
			});
		} catch (e) {
			console.warn('DotLottie failed to load:', e);
		}

		return this._lottieContainer;
	}

	async renderTasks(initialLoad = false, skipFetch = false) {
		if (initialLoad) {
			Skeleton.render(this.taskList, 5);
		}

		const isTrashView = this.currentFilter === 'trash';

		if (!skipFetch) {
			// Always fetch both to keep counters accurate
			const fetches = [];
			if (isTrashView) {
				this.trashTasks = await Store.getTrashTasks();
				// Also refresh normal tasks in background for counter
				Store.getTasks().then((t) => {
					this.tasks = t;
					this._updateFilterCounts();
				});
			} else {
				this.tasks = await Store.getTasks();
				// Also refresh trash tasks in background for counter
				Store.getTrashTasks().then((t) => {
					this.trashTasks = t;
					this._updateFilterCounts();
				});
			}
		}

		this.taskList.innerHTML = '';
		this._activeTaskItem = null;

		let displayTasks;
		if (isTrashView) {
			displayTasks = this.trashTasks || [];
		} else {
			displayTasks = this.tasks || [];
			if (this.currentFilter === 'active') {
				displayTasks = displayTasks.filter((t) => !t.completed);
			} else if (this.currentFilter === 'done') {
				displayTasks = displayTasks.filter((t) => t.completed);
			}
		}

		// Manage trash timers
		if (isTrashView) {
			this._startTrashTimers();
			this._stopCompletionTimers();
		} else {
			this._stopTrashTimers();
			this._startCompletionTimers();
		}

		if (displayTasks.length === 0) {
			const lottieEl = await this._ensureLottieContainer();
			// Change message for trash
			const msg = lottieEl.querySelector('.no-tasks-message');
			if (msg) {
				msg.textContent = isTrashView ? 'Trash is empty' : 'No tasks found';
			}
			this.taskList.appendChild(lottieEl);
			this._updateFilterCounts();
			return;
		}

		// Batch DOM insertion via DocumentFragment (single reflow)
		const fragment = document.createDocumentFragment();
		displayTasks.forEach((task) => {
			const taskElement = TaskItem.create(
				task,
				(id) => this.deleteTask(id),
				(id, completed) => this.toggleTask(id, completed),
				(id, text, el) => this.editTask(id, text, el),
				{
					isTrash: isTrashView,
					onRestore: isTrashView ? (id) => this.restoreTask(id) : null,
					onPermanentDelete: isTrashView ? (id) => this.permanentDeleteTask(id) : null,
				}
			);
			fragment.appendChild(taskElement);
		});
		this.taskList.appendChild(fragment);

		this._updateFilterCounts();
	}

	_updateFilterCounts() {
		if (!this.filterBtns) return; // not yet initialized

		const tasks = this.tasks || [];
		const trashTasks = this.trashTasks || [];

		const counts = {
			all: tasks.length,
			active: tasks.filter((t) => !t.completed).length,
			done: tasks.filter((t) => t.completed).length,
			trash: trashTasks.length,
		};

		this.filterBtns.forEach((btn) => {
			const filter = btn.dataset.filter;
			const count = counts[filter] ?? 0;

			let badge = btn.querySelector('.filter-count');
			if (!badge) {
				badge = document.createElement('span');
				badge.classList.add('filter-count');
				btn.appendChild(badge);
			}
			badge.textContent = count;
		});
	}
}

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
	new App();
});

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
	window.addEventListener('load', () => {
		navigator.serviceWorker
			.register('/sw.js')
			.then((registration) => {
				console.log('Service Worker registered:', registration.scope);
			})
			.catch((error) => {
				console.log('Service Worker registration failed:', error);
			});
	});
}
