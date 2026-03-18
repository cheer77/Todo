import { databases } from '../appwrite.js';
import { ID, Query, Permission, Role } from 'appwrite';
import io from 'socket.io-client';

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_ID;

// Initialize Socket.IO client for real-time sync
const SOCKET_SERVER = import.meta.env.VITE_SOCKET_SERVER || 'http://localhost:3000';
export const socket = io(SOCKET_SERVER, {
	reconnection: true,
	reconnectionDelay: 1000,
	reconnectionDelayMax: 5000,
	reconnectionAttempts: 5,
});

socket.on('connect', () => {
	console.log('✅ Store: Socket.IO client connected:', socket.id);
});

socket.on('connect_error', (error) => {
	console.warn('⚠️ Store: Socket.IO connection error:', error.message);
});

socket.on('disconnect', () => {
	console.log('🔌 Store: Socket.IO disconnected');
});

/**
 * Notify all connected clients about task changes
 */
function notifyTasksChange(changeType = 'tasks:change') {
	socket.emit(changeType);
}

export class Store {
	static async getTasks() {
		try {
			const response = await databases.listDocuments(DATABASE_ID, COLLECTION_ID, [
				Query.equal('isDeleted', false),
				Query.orderAsc('order'),
			]);
			return response.documents.map((doc) => ({
				id: doc.$id,
				...doc,
			}));
		} catch (e) {
			console.error('Failed to load tasks', e);
			return [];
		}
	}

	static async addTask(task) {
		try {
			// Get current tasks to determine the next order value (added to top)
			const currentTasks = await this.getTasks();
			const minOrder =
				currentTasks.length > 0
					? Math.min(...currentTasks.map((t) => (t.order !== undefined ? t.order : 0)))
					: 0;
			const nextOrder = currentTasks.length > 0 ? minOrder - 1 : 0;

			const response = await databases.createDocument(
				DATABASE_ID,
				COLLECTION_ID,
				ID.unique(),
				{
					text: task.text,
					completed: task.completed || false,
					order: nextOrder,
					createdAt: task.createdAt || new Date().toISOString(),
					isDeleted: false,
					isEdited: false,
				},
				[Permission.read(Role.any()), Permission.update(Role.any()), Permission.delete(Role.any())]
			);

			// Notify all clients about the change
			notifyTasksChange('tasks:change');

			return {
				id: response.$id,
				...response,
			};
		} catch (e) {
			console.error('Failed to add task', e);
			throw e;
		}
	}

	static async deleteTask(id) {
		try {
			await databases.updateDocument(DATABASE_ID, COLLECTION_ID, id, {
				isDeleted: true,
				deletedAt: new Date().toISOString(),
			});
			notifyTasksChange('tasks:change');
		} catch (e) {
			console.error('Failed to delete task', e);
		}
	}

	static async updateTask(id, text) {
		try {
			const response = await databases.updateDocument(DATABASE_ID, COLLECTION_ID, id, {
				text,
				isEdited: true,
			});
			notifyTasksChange('tasks:change');
			return {
				id: response.$id,
				...response,
			};
		} catch (e) {
			console.error('Failed to update task', e);
			throw e;
		}
	}

	static async toggleTask(id, currentCompleted) {
		try {
			const updates = { completed: !currentCompleted };
			if (!currentCompleted) {
				// Becoming completed
				updates.completedAt = new Date().toISOString();
			} else {
				updates.completedAt = null;
			}

			await databases.updateDocument(DATABASE_ID, COLLECTION_ID, id, updates);
			notifyTasksChange('tasks:change');
		} catch (e) {
			console.error('Failed to toggle task', e);
		}
	}

	static async updateOrder(tasksWithOrder) {
		// Appwrite doesn't have a native batch update for documents yet.
		// We have to do it individually or use an Appwrite Function.
		try {
			const promises = tasksWithOrder.map((taskItem) =>
				databases.updateDocument(DATABASE_ID, COLLECTION_ID, taskItem.id, { order: taskItem.order })
			);
			await Promise.all(promises);
			notifyTasksChange('tasks:change');
		} catch (e) {
			console.error('Failed to reorder tasks', e);
		}
	}

	static async getTrashTasks() {
		try {
			const response = await databases.listDocuments(DATABASE_ID, COLLECTION_ID, [
				Query.equal('isDeleted', true),
				Query.orderAsc('deletedAt'),
			]);
			return response.documents.map((doc) => ({
				id: doc.$id,
				...doc,
			}));
		} catch (e) {
			console.error('Failed to load trash tasks', e);
			return [];
		}
	}

	static async restoreTask(id) {
		try {
			const response = await databases.updateDocument(DATABASE_ID, COLLECTION_ID, id, {
				isDeleted: false,
				deletedAt: null,
			});
			notifyTasksChange('tasks:change');
			return {
				id: response.$id,
				...response,
			};
		} catch (e) {
			console.error('Failed to restore task', e);
			throw e;
		}
	}

	static async permanentDeleteTask(id) {
		try {
			await databases.deleteDocument(DATABASE_ID, COLLECTION_ID, id);
			notifyTasksChange('tasks:change');
		} catch (e) {
			console.error('Failed to permanently delete task', e);
		}
	}
}
