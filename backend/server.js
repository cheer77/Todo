require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const { sequelize, Task } = require('./models/Task');

const app = express();
const httpServer = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Middleware
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      process.env.FRONTEND_URL
    ].filter(Boolean); // Remove undefined values
    
    const isDev = process.env.NODE_ENV !== 'production';
    if (isDev) {
      console.log(`CORS check - Origin: ${origin}, Allowed:`, allowedOrigins);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      if (isDev) {
        console.log(`❌ CORS rejected for: ${origin}. Add to FRONTEND_URL env var.`);
      }
      // Don't throw error, just reject with false
      callback(null, false);
    }
  },
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '5mb' })); // Increase limit for longer task text

// Socket.IO
const io = new Server(httpServer, { cors: corsOptions });

io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
});

// Database Connection & Sync
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
    } else {
      // SQLite specific migration syntax
      try {
        await sequelize.query('ALTER TABLE Tasks ADD COLUMN isEdited BOOLEAN DEFAULT false;');
        console.log('✅ Auto-migration: isEdited column added (SQLite)');
      } catch (e) {
        // Already migrated or no change needed
      }
    }
  })
  .catch(err => console.error('Database sync error:', err));

// Routes

// GET all tasks
app.get('/api/tasks', async (req, res) => {
  try {
    const tasks = await Task.findAll({ order: [['order', 'ASC']] });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST new task
app.post('/api/tasks', async (req, res) => {
  try {
    console.log('Received task data:', req.body);
    
    // Validate required fields
    if (!req.body.text || req.body.text.trim() === '') {
      return res.status(400).json({ message: 'Task text is required' });
    }
    
    // New tasks appear at top: shift all existing orders up by 1, then assign order 0
    await Task.increment('order', { by: 1, where: {} });
    
    const task = await Task.create({
      text: req.body.text,
      completed: req.body.completed,
      order: 0
    });
    
    io.emit('tasks:update');
    res.status(201).json(task);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(400).json({ 
      message: error.message,
      details: error.errors ? error.errors.map(e => e.message) : undefined
    });
  }
});

// PUT reorder tasks (Batch update) - MUST be before /:id routes
app.put('/api/tasks/reorder/batch', async (req, res) => {
  try {
    const { tasks } = req.body; // Expects array of { id, order }
    if (!Array.isArray(tasks)) {
      return res.status(400).json({ message: 'Invalid data format' });
    }

    // Atomic batch update inside a transaction
    await sequelize.transaction(async (t) => {
      const updates = tasks.map(taskItem => 
        Task.update(
          { order: taskItem.order },
          { where: { id: taskItem.id }, transaction: t }
        )
      );
      await Promise.all(updates);
    });

    io.emit('tasks:update');
    res.json({ message: 'Tasks reordered' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT update task (toggle or text)
app.put('/api/tasks/:id', async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    
    const updates = { ...req.body };
    
    // Check if text is changing to mark as edited
    if (req.body.text && req.body.text !== task.text) {
        updates.isEdited = true;
    }

    await task.update(updates);
    io.emit('tasks:update');
    res.json(task);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE task
app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    
    await task.destroy();
    io.emit('tasks:update');
    res.json({ message: 'Task deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    database: sequelize.getDialect(),
    timestamp: new Date().toISOString()
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
