import '../scss/style.scss';
import { Store } from './modules/Store.js';
import { TaskItem } from './modules/TaskItem.js';
import { DragDrop } from './modules/DragDrop.js';

class App {
    constructor() {
        this.taskInput = document.getElementById('task-input');
        this.addBtn = document.getElementById('add-btn');
        this.taskList = document.getElementById('task-list');

        this.init();
    }

    async init() {
        await this.renderTasks();
        this.setupEventListeners();
        this.setupDragDrop();
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
        if (taskText === '') return;

        const newTask = {
            text: taskText,
            completed: false
        };

        await Store.addTask(newTask);
        this.renderTasks(); 
        this.taskInput.value = '';
        this.taskInput.focus();
    }

    async deleteTask(id) {
        await Store.deleteTask(id);
        this.renderTasks(); 
    }

    async toggleTask(id, completed) {
        await Store.toggleTask(id, completed);
    }

    async handleReorder() {
        // Scrape the DOM to get new order of IDs
        const tasksWithOrder = [];
        this.taskList.querySelectorAll('.task-item').forEach((item, index) => {
            const id = item.dataset.id;
            tasksWithOrder.push({ id, order: index });
        });
        await Store.updateOrder(tasksWithOrder);
    }

    async renderTasks() {
        this.taskList.innerHTML = '';
        const tasks = await Store.getTasks();
        
        tasks.forEach((task) => {
            const taskElement = TaskItem.create(
                task, 
                (id) => this.deleteTask(id), 
                (id, completed) => this.toggleTask(id, completed)
            );
            this.taskList.appendChild(taskElement);
        });
    }
}

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    new App();
});
