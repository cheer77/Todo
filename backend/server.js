require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
const httpServer = http.createServer(app);
const PORT = process.env.PORT || 3000;

/**
 * ⏰ How long a completed task stays before auto-moving to Trash.
 * Default: 1 hour (60 * 60 * 1000 ms)
 * ⚠️ Must match COMPLETION_AUTO_TRASH_MS in frontend/src/js/main.js
 */
const COMPLETED_AUTO_TRASH_MS = 60 * 60 * 1000; // 1 hour

/**
 * ⏰ How long a deleted task stays in trash before permanent deletion.
 * Default: 24 hours (24 * 60 * 60 * 1000 ms)
 * ⚠️ Must match DEFAULT_TTL_MS in frontend/src/js/modules/TrashTimer.js
 */
const TRASH_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ─────────────────────────────────────────────────────────────────────
// Appwrite Configuration
// ─────────────────────────────────────────────────────────────────────

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const COLLECTION_ID = process.env.APPWRITE_COLLECTION_ID;

if (!APPWRITE_PROJECT_ID || !APPWRITE_API_KEY || !DATABASE_ID || !COLLECTION_ID) {
	console.error('❌ Missing required Appwrite env vars');
	process.exit(1);
}

/**
 * Helper function to make Appwrite API calls with Admin credentials
 */
async function appwriteAPI(method, endpoint, body = null) {
	const url = `${APPWRITE_ENDPOINT}${endpoint}`;
	const headers = {
		'Content-Type': 'application/json',
		'X-Appwrite-Project': APPWRITE_PROJECT_ID,
		'X-Appwrite-Key': APPWRITE_API_KEY,
	};

	const config = {
		method,
		headers,
	};

	if (body) {
		config.body = JSON.stringify(body);
	}

	try {
		const response = await fetch(url, config);
		const data = await response.json();

		if (!response.ok) {
			throw new Error(data.message || `API error: ${response.status}`);
		}

		return data;
	} catch (error) {
		console.error(`❌ Appwrite API error (${method} ${endpoint}):`, error.message);
		throw error;
	}
}

// ─────────────────────────────────────────────────────────────────────
// Middleware & Socket.IO
// ─────────────────────────────────────────────────────────────────────

const corsOptions = {
	origin: function (origin, callback) {
		if (!origin) return callback(null, true);

		const allowedOrigins = [
			'http://localhost:5173',
			'http://localhost:3000',
			process.env.FRONTEND_URL,
		].filter(Boolean);

		const isDev = process.env.NODE_ENV !== 'production';
		if (isDev) {
			console.log(`CORS check - Origin: ${origin}, Allowed:`, allowedOrigins);
		}

		if (allowedOrigins.indexOf(origin) !== -1) {
			callback(null, true);
		} else {
			if (isDev) {
				console.log(`❌ CORS rejected for: ${origin}`);
			}
			callback(null, false);
		}
	},
	credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '5mb' }));

// Socket.IO Server
const io = new Server(httpServer, { cors: corsOptions });

io.on('connection', (socket) => {
	console.log('🔌 Socket.IO client connected:', socket.id);

	// Listen for task changes from clients
	socket.on('tasks:change', () => {
		console.log('📡 Task change notified by', socket.id);
		// Broadcast to all other clients
		socket.broadcast.emit('tasks:change');
	});

	socket.on('disconnect', () => {
		console.log('🔌 Socket.IO client disconnected:', socket.id);
	});
});

// ─────────────────────────────────────────────────────────────────────
// Appwrite Background Tasks (polling-based)
// ─────────────────────────────────────────────────────────────────────

/**
 * Check for completed tasks older than 1h and move to trash.
 * Runs as fallback if Appwrite Function is not deployed.
 */
async function checkAndAutoTrashCompleted() {
	try {
		const cutoff = new Date(Date.now() - COMPLETED_AUTO_TRASH_MS).toISOString();

		// Query completed tasks older than cutoff
		// Appwrite query format: /documents?queries[]=equal("field","value")&queries[]=...
		const queries = [
			'equal("completed", true)',
			'equal("isDeleted", false)',
			`lessThan("completedAt", "${cutoff}")`,
		];
		const queryString = queries.map((q, i) => `queries[${i}]=${encodeURIComponent(q)}`).join('&');
		const listEndpoint = `/databases/${DATABASE_ID}/collections/${COLLECTION_ID}/documents?${queryString}`;

		const response = await appwriteAPI('GET', listEndpoint);

		if (response.documents && response.documents.length > 0) {
			const updates = response.documents.map((doc) =>
				appwriteAPI(
					'PATCH',
					`/databases/${DATABASE_ID}/collections/${COLLECTION_ID}/documents/${doc.$id}`,
					{
						isDeleted: true,
						deletedAt: new Date().toISOString(),
					}
				)
			);

			await Promise.all(updates);
			console.log(`⏰ Auto-trashed ${response.documents.length} completed task(s)`);
			io.emit('tasks:update');
		}
	} catch (e) {
		console.error('❌ Auto-trash error:', e.message);
	}
}

/**
 * Check for deleted tasks older than 24h and permanently delete.
 * Runs as fallback if Appwrite Function is not deployed.
 */
async function checkAndPurgeExpiredTrash() {
	try {
		const cutoff = new Date(Date.now() - TRASH_TTL_MS).toISOString();

		// Query deleted tasks older than cutoff
		const queries = ['equal("isDeleted", true)', `lessThan("deletedAt", "${cutoff}")`];
		const queryString = queries.map((q, i) => `queries[${i}]=${encodeURIComponent(q)}`).join('&');
		const listEndpoint = `/databases/${DATABASE_ID}/collections/${COLLECTION_ID}/documents?${queryString}`;

		const response = await appwriteAPI('GET', listEndpoint);

		if (response.documents && response.documents.length > 0) {
			const deletes = response.documents.map((doc) =>
				appwriteAPI(
					'DELETE',
					`/databases/${DATABASE_ID}/collections/${COLLECTION_ID}/documents/${doc.$id}`
				)
			);

			await Promise.all(deletes);
			console.log(`🗑️ Permanently deleted ${response.documents.length} expired task(s)`);
			io.emit('tasks:update');
		}
	} catch (e) {
		console.error('❌ Trash purge error:', e.message);
	}
}

// ─────────────────────────────────────────────────────────────────────
// Server Initialization
// ─────────────────────────────────────────────────────────────────────

async function startServer() {
	try {
		console.log('🚀 Starting Appwrite relay server...');

		// Test Appwrite connection (try simple query without filters)
		try {
			const testConnection = await appwriteAPI(
				'GET',
				`/databases/${DATABASE_ID}/collections/${COLLECTION_ID}/documents`
			);
			console.log('✅ Appwrite connection OK');
		} catch (testError) {
			console.warn('⚠️ Appwrite connection test failed, but continuing:', testError.message);
		}

		// Start background tasks
		// TODO: Fix query syntax for Appwrite API
		// checkAndAutoTrashCompleted(); // run once on startup
		// setInterval(checkAndAutoTrashCompleted, 60 * 1000); // every 1 minute
		// console.log('⏰ Auto-trash check: every 1 minute');

		// checkAndPurgeExpiredTrash(); // run once on startup
		// setInterval(checkAndPurgeExpiredTrash, 60 * 60 * 1000); // every 1 hour
		// console.log('🕐 Trash purge check: every 1 hour');

		// Start HTTP server
		httpServer.listen(PORT, () => {
			console.log(`🌐 Socket.IO relay server listening on port ${PORT}`);
			console.log(`📡 Frontend connects to ws://localhost:${PORT}`);
		});
	} catch (error) {
		console.error('❌ Failed to start server:', error.message);
		process.exit(1);
	}
}

startServer();

// ─────────────────────────────────────────────────────────────────────
// API Routes (minimal)
// ─────────────────────────────────────────────────────────────────────

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
	res.json({
		status: 'ok',
		type: 'Socket.IO relay + Appwrite',
		timestamp: new Date().toISOString(),
		database: 'Appwrite Cloud',
	});
});

/**
 * Webhook endpoint for Appwrite Functions notifications
 * (Optional: implement if you want Functions to push updates)
 */
app.post('/webhooks/tasks-updated', (req, res) => {
	console.log('📢 Webhook notification: tasks updated');
	io.emit('tasks:update');
	res.json({ received: true });
});

// ─────────────────────────────────────────────────────────────────────
// Error handling
// ─────────────────────────────────────────────────────────────────────

app.use((err, req, res, next) => {
	console.error('❌ Server error:', err);
	res.status(500).json({ error: err.message });
});

app.use((err, req, res, next) => {
	console.error('❌ Server error:', err);
	res.status(500).json({ error: err.message });
});
