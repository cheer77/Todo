require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const { Client, Databases, Query } = require('appwrite');

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

// Appwrite SDK Configuration
const appwriteClient = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(appwriteClient);
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const COLLECTION_ID = process.env.APPWRITE_COLLECTION_ID;

if (!DATABASE_ID || !COLLECTION_ID) {
  console.error('❌ Missing APPWRITE_DATABASE_ID or APPWRITE_COLLECTION_ID');
  process.exit(1);
}

// Middleware
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      process.env.FRONTEND_URL
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
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '5mb' }));

// Socket.IO Server
const io = new Server(httpServer, { cors: corsOptions });

io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Appwrite Background Tasks (polling-based monitoring)
// ─────────────────────────────────────────────────────────────────────

/**
 * Check for completed tasks older than 1h and move to trash.
 * This runs as a fallback if Appwrite Function is not deployed.
 */
async function checkAndAutoTrashCompleted() {
  try {
    const cutoff = new Date(Date.now() - COMPLETED_AUTO_TRASH_MS).toISOString();
    
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTION_ID,
      [
        Query.equal('completed', true),
        Query.equal('isDeleted', false),
        Query.isNotNull('completedAt'),
        Query.lessThan('completedAt', cutoff)
      ]
    );

    if (response.documents.length > 0) {
      const updates = response.documents.map(doc =>
        databases.updateDocument(DATABASE_ID, COLLECTION_ID, doc.$id, {
          isDeleted: true,
          deletedAt: new Date().toISOString()
        })
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
 * This runs as a fallback if Appwrite Function is not deployed.
 */
async function checkAndPurgeExpiredTrash() {
  try {
    const cutoff = new Date(Date.now() - TRASH_TTL_MS).toISOString();
    
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTION_ID,
      [
        Query.equal('isDeleted', true),
        Query.lessThan('deletedAt', cutoff)
      ]
    );

    if (response.documents.length > 0) {
      const deletes = response.documents.map(doc =>
        databases.deleteDocument(DATABASE_ID, COLLECTION_ID, doc.$id)
      );

      await Promise.all(deletes);
      console.log(`🗑️ Permanently deleted ${response.documents.length} expired task(s)`);
      io.emit('tasks:update');
    }
  } catch (e) {
    console.error('❌ Trash purge error:', e.message);
  }
}

sequelize.sync()
  .then(async () => {
    console.log(`Database synced (${sequelize.getDialect()})`);
    console.log(`Using: ${process.env.DATABASE_URL ? 'PostgreSQL' : 'SQLite'}`);

    // Auto-migrate: ensure text column is TEXT (not VARCHAR(255))
    if (process.env.DATABASE_URL) {
      try {
        await sequelize.query('ALTER TABLE "Tasks" ALTER COLUMN "text" TYPE TEXT;');
        console.log('✅ Auto-migration: text column set to TEXT');
      } catch (e) {
        // Already migrated or no change needed — safe to ignore
      }
      
      try {
        await sequelize.query('ALTER TABLE "Tasks" ADD COLUMN "isEdited" BOOLEAN DEFAULT false;');
        console.log('✅ Auto-migration: isEdited column added');
      } catch (e) {
        // Already migrated or no change needed
      }

      try {
        await sequelize.query('ALTER TABLE "Tasks" ADD COLUMN "isDeleted" BOOLEAN DEFAULT false;');
        console.log('✅ Auto-migration: isDeleted column added');
      } catch (e) { /* already exists */ }

      try {
        await sequelize.query('ALTER TABLE "Tasks" ADD COLUMN "deletedAt" TIMESTAMP;');
        console.log('✅ Auto-migration: deletedAt column added');
      } catch (e) { /* already exists */ }

      try {
        await sequelize.query('ALTER TABLE "Tasks" ADD COLUMN "completedAt" TIMESTAMP;');
        console.log('✅ Auto-migration: completedAt column added');
      } catch (e) { /* already exists */ }
    } else {
      // SQLite specific migration syntax
      try {
        await sequelize.query('ALTER TABLE Tasks ADD COLUMN isEdited BOOLEAN DEFAULT false;');
        console.log('✅ Auto-migration: isEdited column added (SQLite)');
      } catch (e) {
        // Already migrated or no change needed
      }

      try {
        await sequelize.query('ALTER TABLE Tasks ADD COLUMN isDeleted BOOLEAN DEFAULT false;');
        console.log('✅ Auto-migration: isDeleted column added (SQLite)');
      } catch (e) { /* already exists */ }

      try {
        await sequelize.query('ALTER TABLE Tasks ADD COLUMN deletedAt DATETIME;');
        console.log('✅ Auto-migration: deletedAt column added (SQLite)');
      } catch (e) { /* already exists */ }

      try {
        await sequelize.query('ALTER TABLE Tasks ADD COLUMN completedAt DATETIME;');
        console.log('✅ Auto-migration: completedAt column added (SQLite)');
      } catch (e) { /* already exists */ }
    }

    // Start hourly purge of expired trash
    purgeExpiredTasks(); // run once on startup
    setInterval(purgeExpiredTasks, 60 * 60 * 1000);
    console.log('🕐 Trash purge cron: every 1 hour');

    // Start per-minute purge of completed tasks (1h deferred deletion)
    purgeCompletedTasks(); // run once on startup
    setInterval(purgeCompletedTasks, 60 * 1000);
    console.log('⏰ Completed purge cron: every 1 minute');
  })
  .catch(err => console.error('Database sync error:', err));

// Routes

// GET all tasks (excludes soft-deleted)
app.get('/api/tasks', async (req, res) => {
  try {
    const tasks = await Task.findAll({
      where: { isDeleted: false },
      order: [['order', 'ASC']]
    });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET trash tasks (only soft-deleted)
app.get('/api/tasks/trash', async (req, res) => {
  try {
    const tasks = await Task.findAll({
      where: { isDeleted: true },
      order: [['deletedAt', 'ASC']]
    });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
// ─────────────────────────────────────────────────────────────────────
// Server Initialization
// ─────────────────────────────────────────────────────────────────────

async function startServer() {
  try {
    console.log('🚀 Starting Appwrite relay server...');
    
    // Test Appwrite connection by listing documents
    const testConnection = await databases.listDocuments(
      DATABASE_ID,
      COLLECTION_ID,
      [Query.limit(1)]
    );
    console.log('✅ Appwrite connection OK');

    // Start background tasks
    checkAndAutoTrashCompleted(); // run once on startup
    setInterval(checkAndAutoTrashCompleted, 60 * 1000); // every 1 minute
    console.log('⏰ Auto-trash check scheduler: every 1 minute');

    checkAndPurgeExpiredTrash(); // run once on startup
    setInterval(checkAndPurgeExpiredTrash, 60 * 60 * 1000); // every 1 hour
    console.log('🕐 Trash purge scheduler: every 1 hour');

    // Start HTTP server
    httpServer.listen(PORT, () => {
      console.log(`🌐 Socket.IO relay server running on port ${PORT}`);
      console.log(`📡 Listening for real-time sync events`);
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
 * Backend only provides health check - all data operations go through Appwrite
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    type: 'Socket.IO relay + Appwrite',
    timestamp: new Date().toISOString(),
    database: 'Appwrite Cloud'
  });
});

/**
 * Webhook endpoint for Appwrite Functions to notify about changes
 * (Optional: implement if you want Functions to push updates)
 */
app.post('/webhooks/tasks-updated', (req, res) => {
  console.log('📢 Webhook notification received');
  io.emit('tasks:update');
  res.json({ received: true });
});

// ─────────────────────────────────────────────────────────────────────
// Error handling
// ─────────────────────────────────────────────────────────────────────

app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(500).json({ error: err.message });
});
