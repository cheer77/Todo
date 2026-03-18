import { databases } from '../appwrite.js';
import { ID, Query, Permission, Role } from 'appwrite';

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_ID;

export class Store {
	static async getTasks() {
		try {
			const response = await databases.listDocuments(DATABASE_ID, COLLECTION_ID, [
				Query.equal('isDeleted', false),
				Query.orderDesc('order'),
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

	static async addTask(text) {
		try {
			const tasks = await this.getTasks();
			const maxOrder = tasks.length > 0 ? Math.max(...tasks.map((t) => t.order)) : 0;

			const response = await databases.createDocument(
				DATABASE_ID,
				COLLECTION_ID,
				ID.unique(),
				{
					text,
					completed: false,
					isDeleted: false,
					order: maxOrder + 1,
					createdAt: new Date().toISOString(),
					completedAt: null,
					deletedAt: null,
				}
			);

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
			const now = new Date().toISOString();
			await databases.updateDocument(DATABASE_ID, COLLECTION_ID, id, {
				isDeleted: true,
				deletedAt: now,
				completed: true,
				completedAt: now,
			});
		} catch (e) {
			console.error('Failed to delete task', e);
		}
	}

	static async updateTask(id, text) {
		try {
			await databases.updateDocument(DATABASE_ID, COLLECTION_ID, id, {
				text,
			});
		} catch (e) {
			console.error('Failed to update task', e);
		}
	}

	static async toggleTask(id, completed) {
		try {
			const now = new Date().toISOString();
			const updates = {
				completed,
				completedAt: completed ? now : null,
			};
			await databases.updateDocument(DATABASE_ID, COLLECTION_ID, id, updates);
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
				completed: false,
				completedAt: null,
			});
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
		} catch (e) {
			console.error('Failed to permanently delete task', e);
		}
	}
}
