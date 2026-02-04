const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/tasks';

export class Store {
    static async getTasks() {
        try {
            const response = await fetch(API_URL);
            if (!response.ok) throw new Error('Failed to fetch tasks');
            return await response.json();
        } catch (e) {
            console.error('Failed to load tasks', e);
            return [];
        }
    }

    static async addTask(task) {
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(task)
            });
            if (!response.ok) throw new Error('Failed to add task');
            return await response.json(); // Returns the created task with ID
        } catch (e) {
            console.error('Failed to add task', e);
        }
    }

    static async deleteTask(id) {
        try {
            const response = await fetch(`${API_URL}/${id}`, {
                method: 'DELETE'
            });
            if (!response.ok) throw new Error('Failed to delete task');
        } catch (e) {
            console.error('Failed to delete task', e);
        }
    }

    static async toggleTask(id, currentCompleted) {
        try {
            const response = await fetch(`${API_URL}/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ completed: !currentCompleted })
            });
            if (!response.ok) throw new Error('Failed to toggle task');
        } catch (e) {
            console.error('Failed to toggle task', e);
        }
    }
    
    static async updateOrder(tasksWithOrder) {
        // tasksWithOrder should be array of { id, order }
        try {
            const response = await fetch(`${API_URL}/reorder/batch`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tasks: tasksWithOrder })
            });
            if (!response.ok) throw new Error('Failed to reorder tasks');
        } catch (e) {
            console.error('Failed to reorder tasks', e);
        }
    }
}
