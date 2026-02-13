require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sequelize, Task } = require('./models/Task');

const app = express();
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
    
    console.log(`CORS check - Origin: ${origin}`);
    console.log(`CORS check - Allowed origins:`, allowedOrigins);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      console.log(`✅ CORS allowed for: ${origin}`);
      callback(null, true);
    } else {
      console.log(`❌ CORS rejected for: ${origin}`);
      console.log(`⚠️  Add this origin to FRONTEND_URL env var: ${origin}`);
      // Don't throw error, just reject with false
      callback(null, false);
    }
  },
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '5mb' })); // Increase limit for longer task text

// Database Connection & Sync
sequelize.sync()
  .then(() => {
    console.log(`Database synced (${sequelize.getDialect()})`);
    console.log(`Using: ${process.env.DATABASE_URL ? 'PostgreSQL' : 'SQLite'}`);
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
    
    // New tasks get order -1 to appear at top
    const task = await Task.create({
      text: req.body.text,
      completed: req.body.completed,
      order: -1
    });
    
    // Reorder all tasks to have sequential order starting from 0
    const allTasks = await Task.findAll({ order: [['order', 'ASC']] });
    const updates = allTasks.map((t, index) => 
      Task.update({ order: index }, { where: { id: t.id } })
    );
    await Promise.all(updates);
    
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

    const updates = tasks.map(taskItem => 
      Task.update(
        { order: taskItem.order },
        { where: { id: taskItem.id } }
      )
    );

    await Promise.all(updates);
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
    
    await task.update(req.body);
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
