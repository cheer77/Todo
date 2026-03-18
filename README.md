# Premium To-Do List (Appwrite Cloud BaaS)

A modern, high-performance To-Do list application featuring a premium "glassmorphism" design, real-time synchronization, and a robust PWA experience. This version is fully powered by **Appwrite Cloud**, eliminating the need for a custom Node.js backend.

## 🌟 Key Features

### Smart Task Management
- **Top-Down Ordering**: New tasks automatically appear at the top for immediate focus.
- **Intelligent Lifecycle**:
    - **Active**: Tasks you are currently working on.
    - **Done**: Completed tasks stay active for 1 hour (prod) / 4 min (test) before auto-moving to Trash.
    - **Trash**: Soft-deleted tasks stay for 24 hours (prod) / 4 min (test) before permanent deletion.
- **Smart Transitions**:
    - Moving a task to Trash automatically marks it as `completed`.
    - Restoring a task from Trash resets it to a fresh `active` state.
- **Real-Time Sync**: Every change is instantly pushed to all devices via Appwrite Realtime.

### Advanced UI / UX
- **Glassmorphism**: Frosted-glass UI with dynamic gradient background globes.
- **Live Countdowns**: Trashed tasks features SVG circular progress rings with second-level precision.
- **Micro-interactions**: Skeleton loaders, smooth "evaporate" and "pop" animations, and responsive tooltips.

### Progressive Web App (PWA)
- **Installable**: Full manifest support for homescreen installation.
- **Offline Capable**: Service Worker (`sw.js`) handles asset caching.
- **Optimized Network**: Custom fetch logic bypasses cache for Appwrite API calls to ensure real-time data accuracy on real devices.

---

## 🏗 Architecture

- **Frontend**: Vite + Vanilla JavaScript (ES Modules).
- **Styling**: Sass (SCSS) with CSS Variables and HSL palettes.
- **Backend (BaaS)**: [Appwrite Cloud](https://cloud.appwrite.io).
- **Automation**: Appwrite Functions (`/appwrite-functions`) handle background cleanup.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- An Appwrite Cloud account and project.

### Installation

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/your-repo/todo.git
    cd todo
    ```

2.  **Environment Setup**:
    Create a `.env` file in the `frontend` directory:
    ```env
    VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
    VITE_APPWRITE_PROJECT_ID=ваше_id
    VITE_APPWRITE_DATABASE_ID=ваше_id
    VITE_APPWRITE_COLLECTION_ID=ваше_id
    ```

3.  **Install Dependencies**:
    ```bash
    npm install && cd frontend && npm install
    ```

### Development
Run the local development server:
```bash
npm run dev
```
The app will be available at `http://localhost:5173`.

---

## ⚙️ Appwrite Configuration

### 1. Database Schema
Ensure your collection has the following attributes:
- `text` (String, required)
- `completed` (Boolean, default: false)
- `isDeleted` (Boolean, default: false)
- `order` (Integer, default: 0)
- `createdAt` (Datetime)
- `completedAt` (Datetime, nullable)
- `deletedAt` (Datetime, nullable)

### 2. Permissions
Set Collection Permissions to **Role:Any** (or your preference) for `Create`, `Read`, `Update`, and `Delete`.

### 3. Functions
Deploy the functions located in `/appwrite-functions`:
- **auto-trash**: Schedule `*/1 * * * *` (checks for completed tasks to move to trash).
- **purge-trash**: Schedule `0 * * * *` (checks for expired trash to permanent delete).

---

## 🧪 Testing Mode
Currently, the application is configured with **4-minute TTLs** for rapid testing:
- **Completion -> Trash**: 4 minutes.
- **Trash -> Permanent Delete**: 4 minutes.

To switch to Production (1hr / 24hr), update the constants in `frontend/src/js/main.js` and the corresponding Appwrite Functions.

---

## 📱 Mobile & Safari Support
For debugging real-time on real devices, check the browser console for:
- `✅ Subscribed to Appwrite Real-time updates`
- `🔄 Appwrite Real-time event`

The Service Worker (`v5`) is configured to never cache API calls, ensuring sync works flawlessly on iOS/Android.
