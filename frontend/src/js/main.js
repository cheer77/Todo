import '../scss/style.scss';
import { io } from 'socket.io-client';
import { Store } from './modules/Store.js';
import { TaskItem } from './modules/TaskItem.js';
import { DragDrop } from './modules/DragDrop.js';
import { Tooltip } from './modules/Tooltip.js';
import { Skeleton } from './modules/Skeleton.js';
import { EditModal } from './modules/EditModal.js';

const MAX_CHARS = 1500;

class App {
    constructor() {
        this.taskInput = document.getElementById('task-input');
        this.addBtn = document.getElementById('add-btn');
        this.taskList = document.getElementById('task-list');
        this.miniLoader = document.getElementById('mini-loader');
        this.charCounter = document.getElementById('char-counter');
        this.charCount = document.getElementById('char-count');

        this.currentFilter = localStorage.getItem('todoFilter') || 'all';

        this.init();
    }

    async init() {
        await this.renderTasks(true); // true for initial load
        this.setupEventListeners();
        this.setupFilters();
        this.setupCharCounter();
        this.setupDragDrop();
        this.setupSocket();
    }

    setupSocket() {
        const socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        this.socket = io(socketUrl);

        this.socket.on('tasks:update', () => {
            console.log('🔄 Real-time update received');
            this.renderTasks(false);
        });

        this.socket.on('connect', () => {
            console.log('🔌 Connected to server:', this.socket.id);
        });
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
    }

    setupFilters() {
        this.filterBtns = document.querySelectorAll('.filter-btn');
        
        // Initialize active state based on currentFilter
        this.filterBtns.forEach(btn => {
            if (btn.dataset.filter === this.currentFilter) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        if (this.currentFilter !== 'all') {
            this.taskList.classList.add('filtered');
        }

        this.filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                this.currentFilter = btn.dataset.filter;
                localStorage.setItem('todoFilter', this.currentFilter);
                
                if (this.currentFilter === 'all') {
                    this.taskList.classList.remove('filtered');
                } else {
                    this.taskList.classList.add('filtered');
                }
                
                this.renderTasks(false, true); // true to skip fetching again
            });
        });
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
                    duration: 4000
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
        new DragDrop(this.taskList, () => {
            this.handleReorder();
        });
    }

    async addTask() {
        const taskText = this.taskInput.value.trim();
        
        if (taskText === '') {
            Tooltip.show({
                target: this.taskInput,
                message: 'Please enter a task!',
                position: 'top',
                duration: 3000
            });
            this.taskInput.focus();
            return;
        }

        if (taskText.length > MAX_CHARS) {
            Tooltip.show({
                target: this.taskInput,
                message: `Too many characters! Reduce to ${MAX_CHARS} or fewer.`,
                position: 'top',
                duration: 3000
            });
            this.taskInput.focus();
            return;
        }

        const newTask = {
            text: taskText,
            completed: false,
            createdAt: new Date().toISOString()
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

    async toggleTask(id, completed) {
        this.showMiniLoader();
        await Store.toggleTask(id, completed);
        this.hideMiniLoader();
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
                    // Update text in DOM without re-rendering
                    const taskItem = this.taskList.querySelector(`[data-id="${taskId}"]`);
                    if (taskItem) {
                        const textSpan = taskItem.querySelector('.task-text');
                        if (textSpan) textSpan.textContent = newText;
                    }
                } catch (e) {
                    console.error('Failed to edit task', e);
                }
                this.hideMiniLoader();
            }
        });
    }

    async handleReorder() {
        if (this.currentFilter !== 'all') return; // Safety check

        // Scrape the DOM to get new order of IDs
        const tasksWithOrder = [];
        this.taskList.querySelectorAll('.task-item').forEach((item, index) => {
            const id = item.dataset.id;
            tasksWithOrder.push({ id, order: index });
        });
        this.showMiniLoader();
        await Store.updateOrder(tasksWithOrder);
        this.hideMiniLoader();
    }

    async renderTasks(initialLoad = false, skipFetch = false) {
        if (initialLoad) {
            Skeleton.render(this.taskList, 5);
        }

        if (!skipFetch) {
            this.tasks = await Store.getTasks();
        }

        this.taskList.innerHTML = '';
        
        let displayTasks = this.tasks || [];
        if (this.currentFilter === 'active') {
            displayTasks = displayTasks.filter(t => !t.completed);
        } else if (this.currentFilter === 'done') {
            displayTasks = displayTasks.filter(t => t.completed);
        }

        if (displayTasks.length === 0) {
            const noTasksMsg = document.createElement('div');
            noTasksMsg.className = 'no-tasks-message';
            noTasksMsg.textContent = 'No tasks found';
            this.taskList.appendChild(noTasksMsg);
            return;
        }

        displayTasks.forEach((task) => {
            const taskElement = TaskItem.create(
                task, 
                (id) => this.deleteTask(id), 
                (id, completed) => this.toggleTask(id, completed),
                (id, text, el) => this.editTask(id, text, el)
            );
            this.taskList.appendChild(taskElement);
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
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('Service Worker registered:', registration.scope);
            })
            .catch((error) => {
                console.log('Service Worker registration failed:', error);
            });
    });
}
