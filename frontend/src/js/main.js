import '../scss/style.scss';
import { io } from 'socket.io-client';
import { Store } from './modules/Store.js';
import { TaskItem } from './modules/TaskItem.js';
import { DragDrop } from './modules/DragDrop.js';
import { Tooltip } from './modules/Tooltip.js';
import { Skeleton } from './modules/Skeleton.js';
import { EditModal } from './modules/EditModal.js';

class App {
    constructor() {
        this.taskInput = document.getElementById('task-input');
        this.addBtn = document.getElementById('add-btn');
        this.taskList = document.getElementById('task-list');
        this.miniLoader = document.getElementById('mini-loader');

        this.init();
    }

    async init() {
        await this.renderTasks(true); // true for initial load
        this.setupEventListeners();
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

    setupDragDrop() {
        new DragDrop(this.taskList, () => {
            this.handleReorder();
        });
    }

    async addTask() {
        const taskText = this.taskInput.value.trim();
        
        if (taskText === '') {
            // Show tooltip when input is empty
            Tooltip.show({
                target: this.taskInput,
                message: 'Please enter a task!',
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
        await this.renderTasks(false); // No skeletons for add
        this.hideMiniLoader();
        this.taskInput.value = '';
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

    async renderTasks(initialLoad = false) {
        if (initialLoad) {
            Skeleton.render(this.taskList, 5);
        }

        const tasks = await Store.getTasks();
        
        // If initial load, we want to clear skeletons.
        // Actually, we always clear innerHTML below, so it's handled.
        
        this.taskList.innerHTML = '';
        
        if (tasks.length === 0) {
            const noTasksMsg = document.createElement('div');
            noTasksMsg.className = 'no-tasks-message';
            noTasksMsg.textContent = 'No tasks yet';
            this.taskList.appendChild(noTasksMsg);
            return;
        }

        tasks.forEach((task) => {
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
