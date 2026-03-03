# Premium To-Do List

A modern, high-performance To-Do list application featuring a premium "glassmorphism" design, smooth animations, and a modular JavaScript architecture. Supports PWA (Progressive Web App) for installable mobile experience.

## Features

### Task Management
- **Create Tasks** — input field with empty-value validation (shows a tooltip warning).
- **Edit Tasks** — animated modal dialog with `Ctrl+Enter` to save and `Escape` to cancel. Displays an "edited" indicator next to the timestamp if the text is modified.
- **Delete Tasks** — soft-delete with "evaporate" animation; tasks move to a **Smart Trash**.
- **Smart Trash** — deleted tasks live in a dedicated Trash view for 24 hours with a live countdown timer (SVG ring spinner). Tasks can be **restored** before auto-purge.
- **Toggle Completion** — checkbox to mark tasks as done, synced with the server.
- **Drag & Drop Reorder** — desktop (HTML5 Drag & Drop via drag-handle) and mobile (Touch Events with a visual clone).
- **Timestamps** — each task displays its creation date & time.
- **Character Limit** — live counter appears on input focus, warns at 90% (yellow) and blocks at 1500 characters (red + tooltip).
- **Expand / Collapse** — long tasks (>400 chars) are automatically truncated with a gradient fade; "Show more / Show less" buttons with smooth animation and auto-scroll.
- **Frontend Filtering** — instantly filter views by `All`, `Active`, `Done`, or `Trash` tasks without extra API calls. Each filter button displays a live task count badge. The selected filter state is preserved across page reloads via `localStorage`.
- **Real-Time Sync** — powered by Socket.IO. Changes made on one device appear instantly on all other connected devices (like Trello).

### UI / UX
- **Glassmorphism Design** — frosted-glass cards with animated gradient background globes.
- **Skeleton Loaders** — animated placeholder cards shown during initial data fetch.
- **Tooltips** — reusable tooltip module with 4 positions (`top`, `right`, `bottom`, `left`), auto-hide, and viewport boundary detection.
- **Mini-Loader** — header spinner shown during any server operation.
- **Responsive** — fully adaptive layout for desktop and mobile devices.
- **Typography** — [Outfit](https://fonts.google.com/specimen/Outfit) font from Google Fonts.

### PWA (Progressive Web App)
- **Service Worker** — Cache First for static assets, Network First for API calls. Automatic cleanup of old caches.
- **Web App Manifest** — icons, theme color, standalone display mode for home screen installation.
- **iOS Support** — meta tags for `apple-mobile-web-app-capable` and `apple-touch-icon`.

## Architecture

The project is split into two parts:
- **Frontend** (`/frontend`): The user interface built with Vite.
- **Backend** (`/backend`): The API server built with Node.js, Express, and SQLite.

## Tech Stack
- **Frontend**: Vite, Sass (SCSS), Vanilla JavaScript (ES Modules).
- **Backend**: Node.js, Express, Sequelize ORM.
- **Database**: SQLite (development), PostgreSQL (production).
- **PWA**: Service Worker, Web App Manifest.
- **Deploy**: Vercel (frontend), Render (backend + PostgreSQL).

## API Endpoints

| Method   | Endpoint                   | Description                            |
|----------|----------------------------|----------------------------------------|
| `GET`    | `/api/tasks`               | Get all tasks (sorted by `order`)      |
| `POST`   | `/api/tasks`               | Create a new task                      |
| `PUT`    | `/api/tasks/:id`           | Update a task (text or completed)      |
| `PUT`    | `/api/tasks/reorder/batch` | Batch update task order                |
| `DELETE` | `/api/tasks/:id`           | Soft-delete a task (moves to trash)    |
| `GET`    | `/api/tasks/trash`         | Get trashed tasks (expiring-first)     |
| `POST`   | `/api/tasks/:id/restore`   | Restore a task from trash              |
| `DELETE` | `/api/tasks/:id/permanent` | Permanently delete a task              |
| `GET`    | `/health`                  | Health check (status, DB type, time)   |

## Frontend Modules

| Module       | Description                                                                                          |
|--------------|------------------------------------------------------------------------------------------------------|
| `App`        | Main application class — handles init, rendering, and orchestrates all operations.                   |
| `Store`      | Static HTTP client — `fetch` wrapper for all API calls (`getTasks`, `addTask`, `deleteTask`, etc.).   |
| `TaskItem`   | DOM factory — creates `<li>` with drag-handle, checkbox, text, edit/delete buttons, and timestamp.   |
| `DragDrop`   | Drag & drop manager — HTML5 DnD (desktop) + Touch Events with a floating clone (mobile).            |
| `EditModal`  | Animated edit dialog — opens from the task card position, validates empty text, keyboard shortcuts.   |
| `Skeleton`   | Generates animated skeleton placeholder cards during initial data load.                               |
| `Tooltip`    | Reusable tooltip class — 4 positions, auto-hide timer, viewport boundary checks, CSS animations.     |
| `TrashTimer` | SVG ring countdown timer — computes remaining TTL, renders progress ring, patches DOM in-place.       |

## Getting Started

### Prerequisites
- Node.js installed on your machine.

### Installation

1. Clone the repository.
2. Install all dependencies (Root, Frontend, and Backend):

```bash
npm install
npm run install:all
```

### Development

Start the full stack application (Frontend + Backend) concurrently:

```bash
npm run dev
```

- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3000

The `database.sqlite` file will be automatically created in the `backend` folder upon first run.

### Environment Variables (Backend)

Copy `backend/.env.example` to `backend/.env`:

| Variable         | Description                                   | Default                 |
|------------------|-----------------------------------------------|-------------------------|
| `PORT`           | Server port                                   | `3000`                  |
| `NODE_ENV`       | Environment (`development` / `production`)    | `development`           |
| `FRONTEND_URL`   | Frontend URL for CORS                         | `http://localhost:5173` |
| `DATABASE_URL`   | PostgreSQL connection string (empty = SQLite)  | —                       |

## Build & Deployment

This project consists of two distinct parts that need to be deployed:
1. **Frontend**: A static Single Page Application (Vite).
2. **Backend**: A Node.js Express API server (DB: SQLite / PostgreSQL).

### 1. Configuration (Environment Variables)

The frontend needs to know where the backend API is located.
- **Local Development**: Defaults to `http://localhost:3000`.
- **Production**: You must set the `VITE_API_URL` environment variable during the build process.

**Example**:
If your backend is hosted at `https://my-api.com`, you should build the frontend with:
`VITE_API_URL=https://my-api.com`

---

### 2. Building the Project

#### Frontend Build
The frontend must be compiled into static HTML/CSS/JS files.

1. Navigate to the frontend directory (or use root script):
   ```bash
   npm run build
   ```
2. This creates a `frontend/dist` folder.
   - This folder contains `index.html` and assets.
   - **These are the only files** you need to upload to your static hosting (Vercel, Netlify, etc.).

#### Backend Preparation
The backend does not require a "build" step (no TypeScript/Babel), but you must install production dependencies.

1. On your server/hosting:
   ```bash
   cd backend
   npm install --production
   ```

---

### 3. Deployment Guide

#### Option A: Cloud Hosting (Easiest & Free)
*Good for: Vercel, Netlify, Render, Railway*

1. **Deploy Backend (e.g., on Render/Railway)**:
   - Connect your repo.
   - Root directory: `backend`.
   - Build Command: `npm install`.
   - Start Command: `node server.js`.
   - **Note URL**: e.g., `https://my-todo-api.onrender.com`.

2. **Deploy Frontend (e.g., on Vercel/Netlify)**:
   - Connect your repo.
   - Root directory: `frontend`.
   - Build Command: `npm run build` (or `vite build`).
   - Output Directory: `dist`.
   - **Environment Variables**: Add `VITE_API_URL` with the value of your Backend URL (e.g., `https://my-todo-api.onrender.com`).
   - *Note*: Do not include `/api/tasks` in the env var, just the origin (e.g. `https://domain.com` or `https://domain.com:3000`). The app appends `/api/tasks`.

#### Option B: VPS / Dedicated Server (Ubuntu + Nginx)
*Good for: DigitalOcean, AWS EC2, Hetzner*

1. **Upload Code**: Clone repo to `/var/www/antygravity`.
2. **Backend Setup**:
   - Install Node.js & NPM.
   - `cd backend && npm install`.
   - Use PM2 to keep it running: `pm2 start server.js --name todo-backend`.
3. **Frontend Setup**:
   - `cd frontend`.
   - `npm install && npm run build`.
   - Configuration is baked in at build time. If hosting on the same domain, default relative paths might work if you proxy correctly, OR build with `VITE_API_URL=https://your-domain.com`.
4. **Nginx Config (Reverse Proxy)**:
   Serve the `dist` folder as static, and proxy `/api` to the running Node (port 3000).

   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       # Frontend (Static Files)
       location / {
           root /var/www/antygravity/frontend/dist;
           index index.html;
           try_files $uri $uri/ /index.html;
       }

       # Backend (API Proxy)
       location /api/ {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
