# Premium To-Do List

A modern, high-performance To-Do list application featuring a premium "glassmorphism" design, smooth animations, and a modular JavaScript architecture.

## Features
- **Premium UI**: Glassmorphism design with animated background globes.
- **Drag & Drop**: Native HTML5 drag-and-drop for reordering tasks.
- **Smart Animations**: "Evaporate" effect on delete with smooth list collapse.
- **State Management**: Tasks persist via `localStorage` (order, text, completed status).
- **Completion Tracking**: Tasks can be marked as "Done", persisting their state.

## Architecture

The project is split into two parts:
- **Frontend** (`/frontend`): The user interface built with Vite.
- **Backend** (`/backend`): The API server built with Node.js, Express, and SQLite.

## Tech Stack
- **Frontend**: Vite, Sass (SCSS), Vanilla JavaScript (ES Modules).
- **Backend**: Node.js, Express, Sequelize, SQLite (Auto-generated database).

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

## Build & Deployment

This project consists of two distinct parts that need to be deployed:
1. **Frontend**: A static Single Page Application (Vite).
2. **Backend**: A Node.js Express API server (DB: SQLite).

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
