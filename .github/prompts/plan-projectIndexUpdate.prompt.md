\# 📇 Premium To-Do List — Project Index

## Overview

Full-stack To-Do app с **glassmorphism**-дизайном, real-time синхронизацией (Socket.IO), PWA, drag-and-drop и «умной корзиной». Архитектура построена на **Appwrite** для управления данными + **Appwrite Functions** для автоматизации фоновых задач.

| Layer               | Stack                                                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------------------------ |
| Frontend            | Vanilla JS (ES Modules), Vite 7, SCSS (Sass), Appwrite SDK, `socket.io-client`, `@lottiefiles/dotlottie-web` |
| Backend (Real-time) | Node.js, Express 4, Socket.IO 4 (broadcast `tasks:update` событий)                                           |
| Database            | Appwrite Databases (Appwrite Cloud)                                                                          |
| Automation          | Appwrite Functions (cron triggers для auto-trash и purge-trash)                                              |
| Deploy              | Vercel (frontend), Appwrite Cloud (backend + functions + database)                                           |

> [!CAUTION]
> **Запрещено** использовать React, Vue, Angular, Svelte. Строго **Vanilla JavaScript**.

---

## File Tree

```
Todo/
├── package.json              ← Root monorepo (concurrently)
├── render.yaml               ← Legacy (не используется, заменён на Appwrite)
├── vercel.json               ← Vercel deploy config (frontend SPA)
├── .ai-context.md            ← AI правила и архитектурный контракт
├── README.md                 ← Документация проекта
├── project_index.md          ← Этот файл
│
├── backend/
│   ├── package.json          ← express, socket.io
│   ├── server.js             ← Socket.IO сервер (71 строк) — только для real-time sync
│   ├── models/               ← Legacy (не используется, перенесено на Appwrite)
│   │   └── Task.js
│   ├── migrate.js            ← Legacy миграции
│   └── .env.example
│
├── appwrite-functions/       ← Serverless функции Appwrite
│   ├── auto-trash/           ← Cron function: перемещает completed(>1ч) в корзину
│   │   └── index.js          ← (38 строк) — работает с Appwrite Databases API
│   └── purge-trash/          ← Cron function: удаляет deleted(>24ч) навсегда
│       └── index.js          ← (30 строк) — работает с Appwrite Databases API
│
├── migration/                ← Инициализация Appwrite
│   ├── package.json
│   └── setup-appwrite.js     ← Скрипт создания database, collection, атрибутов
│
└── frontend/
    ├── package.json          ← vite 7, sass, appwrite SDK, socket.io-client, dotlottie-web
    ├── vite.config.js        ← Vite конфиг (publicDir, SCSS sourcemaps, host: true)
    ├── index.html            ← Главная HTML-страница (96 строк)
    ├── public/
    │   ├── manifest.json     ← PWA манифест
    │   ├── sw.js             ← Service Worker (Cache First + Network First)
    │   ├── cat.lottie        ← DotLottie анимация (5KB, пустое состояние)
    │   ├── cat.json          ← Lottie JSON (legacy fallback)
    │   └── icons/            ← PWA иконки
    └── src/
        ├── js/
        │   ├── appwrite.js       ← Client инициализация, Databases SDK (11 строк)
        │   ├── main.js           ← Класс App — главный контроллер (501 строка)
        │   └── modules/
        │       ├── Store.js      ← Appwrite Databases wrapper (187 строк)
        │       ├── TaskItem.js   ← DOM-фабрика <li> элементов (277 строк)
        │       ├── DragDrop.js   ← Drag & Drop (desktop + mobile touch, 153 строки)
        │       ├── EditModal.js  ← Модальное окно редактирования (130 строк)
        │       ├── Tooltip.js    ← Тултипы (4 позиции, viewport clamp, 127 строк)
        │       ├── TrashTimer.js ← SVG ring countdown (24ч TTL, 193 строки)
        │       └── Skeleton.js   ← Skeleton-загрузчики (30 строк)
        └── scss/
            ├── style.scss        ← Главный файл (@use всех партиалов)
            ├── _variables.scss   ← CSS Custom Properties (Design Tokens)
            ├── _base.scss        ← Reset, body, typography
            ├── _animations.scss  ← @keyframes, .removing, transitions
            ├── _layout.scss      ← .container, header, .background-globes
            ├── _forms.scss       ← .input-group, #add-btn, .char-counter
            ├── _tasks.scss       ← .task-item, .task-content, checkbox, DnD
            ├── _tooltip.scss     ← .tooltip, .tooltip--visible, позиции
            ├── _skeleton.scss    ← .skeleton-card, shimmer-анимация
            ├── _edit-modal.scss  ← .edit-modal, .edit-modal-overlay
            ├── _trash.scss       ← Trash UI, .trash-timer, restore-кнопка
            └── _media.scss       ← Responsive breakpoints
```

---

## Data Model — `Task` Collection

**Appwrite Collection ID**: `VITE_APPWRITE_COLLECTION_ID`

| Атрибут       | Тип           | Default | Індексирован | Описание                                                |
| ------------- | ------------- | ------- | ------------ | ------------------------------------------------------- |
| `$id`         | String (auto) | —       | ✓            | Appwrite Document ID                                    |
| `text`        | String        | —       | —            | Текст задачи (до 1500 символов на фронте, TEXT в БД)    |
| `completed`   | Boolean       | `false` | ✓            | Статус выполнения                                       |
| `order`       | Integer       | `0`     | ✓            | Порядок сортировки (ASC для All/Active, desc для Trash) |
| `isEdited`    | Boolean       | `false` | —            | Флаг «отредактировано»                                  |
| `isDeleted`   | Boolean       | `false` | ✓            | Soft-delete флаг (для Trash)                            |
| `deletedAt`   | DateTime      | `null`  | ✓            | Время удаления (для 24ч TTL purge)                      |
| `completedAt` | DateTime      | `null`  | ✓            | Время выполнения (для 1ч auto-trash)                    |
| `createdAt`   | DateTime      | auto    | —            | Timestamp создания                                      |
| `$createdAt`  | DateTime      | auto    | —            | Appwrite system timestamp                               |
| `$updatedAt`  | DateTime      | auto    | —            | Appwrite system timestamp                               |

**Permissions**: `read(Role.any())`, `update(Role.any())`, `delete(Role.any())` — публичный доступ без аутентификации.

---

## Appwrite Configuration

### Frontend Setup — appwrite.js

```javascript
import { Client, Databases } from 'appwrite';

const client = new Client();

client
	.setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
	.setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

export const databases = new Databases(client);
```

### Environment Variables (Frontend)

| Переменная                    | Описание              | Пример                            |
| ----------------------------- | --------------------- | --------------------------------- |
| `VITE_APPWRITE_ENDPOINT`      | Appwrite API endpoint | `https://cloud.appwrite.io/v1`    |
| `VITE_APPWRITE_PROJECT_ID`    | Appwrite Project ID   | `your-project-id`                 |
| `VITE_APPWRITE_DATABASE_ID`   | Database ID           | `todo-db-123`                     |
| `VITE_APPWRITE_COLLECTION_ID` | Collection ID (Tasks) | `tasks-collection-456`            |
| `VITE_API_URL`                | Backend Socket.IO URL | `http://localhost:3000` (для dev) |

### Environment Variables (Appwrite Functions)

| Переменная                            | Описание                          | Пример                         |
| ------------------------------------- | --------------------------------- | ------------------------------ |
| `APPWRITE_FUNCTION_ENDPOINT_INTERNAL` | Internal Appwrite endpoint (auto) | `https://cloud.appwrite.io/v1` |
| `APPWRITE_FUNCTION_PROJECT_ID`        | Project ID (auto)                 | —                              |
| `APPWRITE_API_KEY`                    | API Key (з доступом до Databases) | `your-api-key`                 |
| `DATABASE_ID`                         | Database ID                       | `todo-db-123`                  |
| `COLLECTION_ID`                       | Collection ID                     | `tasks-collection-456`         |

---

## Appwrite Databases API

**Все операции выполняются через Appwrite Databases SDK**, не через REST API.

| Метод                       | Операція      | Appwrite SDK           | Параметри                                                    | Описание                                            |
| --------------------------- | ------------- | ---------------------- | ------------------------------------------------------------ | --------------------------------------------------- |
| `getTasks()`                | GET (active)  | `listDocuments()`      | Query: `isDeleted=false`, Sort: `order ASC`                  | Активні задачі                                      |
| `addTask(task)`             | POST          | `createDocument()`     | text, completed=false, order (min-1), createdAt, permissions | Нова задача додається на початок (order негативний) |
| `updateTask(id, text)`      | PUT           | `updateDocument()`     | text, isEdited=true                                          | Зберегти зміни тексту                               |
| `toggleTask(id, completed)` | PUT           | `updateDocument()`     | completed, completedAt (if true: now, else: null)            | Відмітити виконаною / повернути назад               |
| `updateOrder(tasks)`        | PUT (batch)   | `updateDocument()` × N | Цикл через Promise.all()                                     | Пакетне оновлення order після D&D                   |
| `deleteTask(id)`            | Soft-delete   | `updateDocument()`     | isDeleted=true, deletedAt=now                                | Перемістити в кошик                                 |
| `getTrashTasks()`           | GET (deleted) | `listDocuments()`      | Query: `isDeleted=true`, Sort: `deletedAt ASC`               | Задачі в кошику                                     |
| `restoreTask(id)`           | PUT           | `updateDocument()`     | isDeleted=false, deletedAt=null                              | Відновити з кошика                                  |
| `permanentDeleteTask(id)`   | DELETE        | `deleteDocument()`     | —                                                            | Видалити назавжди                                   |

---

## Appwrite Functions

### auto-trash — appwrite-functions/auto-trash/index.js

**Призначення**: Автоматично переміщати задачі, завершені більше 1 години тому, до кошика.

**Trigger**: Cron job (рекомендується кожну хвилину: `*/1 * * * *`)

**Логіка**:

1. Запросити всі документи з `completed=true`, `isDeleted=false`, `completedAt < (now - 1ч)`
2. Для кожного документу: `updateDocument()` з `{ isDeleted: true, deletedAt: now }`
3. Логувати кількість переміщених задач

**Env vars**: `DATABASE_ID`, `COLLECTION_ID`, `APPWRITE_API_KEY`

---

### purge-trash — appwrite-functions/purge-trash/index.js

**Призначення**: Видаляти задачі з кошика, які там більше 24 годин.

**Trigger**: Cron job (рекомендується раз на годину: `0 * * * *`)

**Логіка**:

1. Запросити всі документи з `isDeleted=true`, `deletedAt < (now - 24ч)`
2. Для кожного документу: `deleteDocument()` (повне видалення)
3. Логувати кількість видалених задач

**Env vars**: `DATABASE_ID`, `COLLECTION_ID`, `APPWRITE_API_KEY`

---

## Migration & Setup

### Migration Script — migration/setup-appwrite.js

**Призначення**: Ініціалізація Appwrite Database і Collection з необхідними атрибутами та індексами.

**Запуск**:

```bash
cd migration
npm install
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1 \
APPWRITE_PROJECT_ID=your-project-id \
APPWRITE_API_KEY=your-api-key \
node setup-appwrite.js
```

**Що створює**:

1. Database (якщо не існує)
2. Collection "tasks" (якщо не існує)
3. Атрибути:
   - `text` (String, required)
   - `completed` (Boolean, default: false)
   - `order` (Integer, default: 0)
   - `isEdited` (Boolean, default: false)
   - `isDeleted` (Boolean, default: false)
   - `deletedAt` (DateTime, optional)
   - `completedAt` (DateTime, optional)
   - `createdAt` (DateTime)
4. Індекси:
   - `completed + isDeleted + order` (для основного query)
   - `isDeleted + deletedAt` (для trash purge)
   - `completed + completedAt` (для auto-trash)

---

## Backend Real-time Sync

### Socket.IO Server — backend/server.js

**Призначення**: Broadcast `tasks:update` eventos всім підключеним клієнтам. Служить **тільки** для real-time синхронізації між табами/клієнтами, не як API.

| Подія          | Випускач                              | Слухач                       | Описание                   |
| -------------- | ------------------------------------- | ---------------------------- | -------------------------- |
| `tasks:update` | Appwrite Functions / Manual broadcast | Frontend `App.setupSocket()` | Перезавантажити всі задачи |

**Як це працює**:

1. Frontend здійснює дію (add/edit/delete) → викликає `Store` метод
2. `Store` оновлює документ в Appwrite Databases
3. Спустя 100-300ms Socket server робить `io.emit('tasks:update')`
4. Усі підключені клієнти отримують подію → `App.renderTasks()`

**Примітка**: Debounce на фронте (300ms) запобігає множественним перерендерам.

---

## Frontend Modules

### `App` — main.js (501 рядок)

Головний контролер застосунку. Керує станом, DOM-подіями, рендерингом.

| Метод                                 | Описание                                                                             |
| ------------------------------------- | ------------------------------------------------------------------------------------ |
| `constructor()`                       | Кешує DOM-елементи, запускає `init()`                                                |
| `init()`                              | `setupRealtime()` → `renderTasks(true)` → `setupEventListeners()` → `setupFilters()` |
| `setupRealtime()`                     | Підключення до Socket.IO (для sync між табами), debounce `tasks:update` (300ms)      |
| `setupFilters()`                      | Фільтри All/Active/Done/Trash, збереження в `localStorage`                           |
| `setupCharCounter()`                  | Лічильник символів (ліміт 1500, yellow 90%, red 100%)                                |
| `addTask()`                           | Валідація → `Store.addTask()` → `renderTasks()` → Socket broadcast                   |
| `deleteTask(id)`                      | `Store.deleteTask()` → `renderTasks()`                                               |
| `restoreTask(id)`                     | `Store.restoreTask()` → `renderTasks()`                                              |
| `permanentDeleteTask(id)`             | `Store.permanentDeleteTask()` → `renderTasks()`                                      |
| `toggleTask(id, completed)`           | `Store.toggleTask()` → `renderTasks()` → show Tooltip countdown (якщо completed)     |
| `editTask(id, text, el)`              | Open `EditModal` → `Store.updateTask()` → `renderTasks()`                            |
| `handleReorder()`                     | Збирає DOM-порядок → `Store.updateOrder()` → Socket broadcast                        |
| `renderTasks(initialLoad, skipFetch)` | Повний перерендер: fetch → filter → DOM rebuild                                      |
| `_startTrashTimers()`                 | Інтервальне оновлення countdown таймерів (trash, 24h TTL)                            |
| `_startCompletionTimers()`            | Інтервальне оновлення countdown таймерів (completed, 1ч до auto-trash)               |
| `_ensureLottieContainer()`            | DotLottie анімація кота для «No tasks»                                               |
| `_updateFilterCounts()`               | Оновлення badge-лічильників на кнопках фільтрів                                      |

**Константи**:

- `MAX_CHARS = 1500` — ліміт довжини задачи
- `SOCKET_DEBOUNCE_MS = 300` — debounce для Socket.IO оновлень
- `TRASH_TIMER_INTERVAL_MS = 60000` (1 хв) — оновлення trash countdown
- `COMPLETION_AUTO_TRASH_MS = 3600000` (1 ч) — час до auto-trash completed задач

---

### `Store` — Store.js (187 рядків)

Wrapper для Appwrite Databases SDK. Усі методи — `static async`.

| Метод                         | Описание                                                        |
| ----------------------------- | --------------------------------------------------------------- |
| `getTasks()`                  | `listDocuments()` з Query: `isDeleted=false`, Sort: `order ASC` |
| `addTask(task)`               | Обчислює `nextOrder`, створює document з permissions            |
| `deleteTask(id)`              | Soft-delete: `{ isDeleted: true, deletedAt: now }`              |
| `updateTask(id, text)`        | `{ text, isEdited: true }`                                      |
| `toggleTask(id, completed)`   | `{ completed: !completed, completedAt: now або null }`          |
| `updateOrder(tasksWithOrder)` | Batch update через Promise.all()                                |
| `getTrashTasks()`             | Query: `isDeleted=true`, Sort: `deletedAt ASC`                  |
| `restoreTask(id)`             | `{ isDeleted: false, deletedAt: null }`                         |
| `permanentDeleteTask(id)`     | Повне видалення documento                                       |

---

### `TaskItem` — TaskItem.js (277 рядків)

DOM-фабрика. Створює `<li class="task-item">` з: drag-handle, checkbox, текст, кнопки edit/delete, timestamp, badge, expand/collapse.

**Для задач у кошику**:

- Кнопки restore / permanent-delete
- `TrashTimer` SVG ring countdown (24h TTL)

**Для виконаних задач** (не у кошику):

- Inline badge `.completion-countdown` з обратним отсчётом до auto-trash (1ч)

---

### `DragDrop` — DragDrop.js (153 рядки)

**Desktop**: HTML5 Drag & Drop API.  
**Mobile**: Touch Events з візуальним клоном.

---

### `EditModal` — EditModal.js (130 рядків)

Singleton-модальне вікно. Анімується від позиції карточки.

**Гарячі клавіші**:

- `Ctrl+Enter` — зберегти
- `Escape` — закрити

---

### `Tooltip` — Tooltip.js (127 рядків)

4 позиції: `top`, `right`, `bottom`, `left`. Viewport boundary clamp. Auto-hide.

---

### `TrashTimer` — TrashTimer.js (193 рядки)

SVG ring countdown. Default TTL = 24ч.

---

### `Skeleton` — Skeleton.js (30 рядків)

Статичні методи: `render()` / `clear()`.

---

## Design System

**CSS Tokens** — \_variables.scss:

| Token                | Value                         | Назначение         |
| -------------------- | ----------------------------- | ------------------ |
| `--bg-color`         | `#0f172a`                     | Тёмный background  |
| `--text-color`       | `#f8fafc`                     | Светлый text       |
| `--primary-color`    | `#6366f1`                     | Indigo accent      |
| `--secondary-color`  | `#a855f7`                     | Purple gradient    |
| `--glass-bg`         | `rgba(255,255,255,0.05)`      | Glass background   |
| `--glass-border`     | `rgba(255,255,255,0.1)`       | Glass border       |
| `--glass-shadow`     | `0 8px 32px rgba(0,0,0,0.37)` | Glass shadow       |
| `--input-bg`         | `rgba(15,23,42,0.6)`          | Input background   |
| `--transition-speed` | `0.3s`                        | Standard animation |

**Шрифт**: Outfit (300, 400, 500, 600)

---

## Data Flow

```
User Action (add/edit/delete/toggle/reorder)
    ↓
App.addTask() / editTask() / deleteTask() etc
    ↓
Store.addTask() → databases.createDocument()  [Appwrite]
Store.updateTask() → databases.updateDocument()
Store.deleteTask() → databases.updateDocument() [soft-delete]
    ↓
Appwrite Databases обновляет документ (backend cloud)
    ↓
Frontend: App получает результат
    ↓
App.renderTasks() → перестроить DOM
    ↓
Backend Socket.IO: io.emit('tasks:update')
    ↓
Все подключённые клиенты получают событие
    ↓
Их App.renderTasks() обновляет UI (sync между табами)

─────────────────────────────────────────────

Background Automation:
    ↓
Appwrite Function `auto-trash` (cron каждую минуту)
    → Query: completed=true, isDeleted=false, completedAt < now-1h
    → updateDocument() для каждого: { isDeleted: true, deletedAt: now }
    ↓
Appwrite Function `purge-trash` (cron каждый час)
    → Query: isDeleted=true, deletedAt < now-24h
    → deleteDocument() для каждого (полное удаление)
```

---

## Правила разработки

1. **Модуль `Store`** — единственная точка доступа к Appwrite
2. **DOM** — прямая манипуляція, без VDOM
3. **Ошибки** — через `Tooltip`, не `alert()`
4. **Permissions** — все docs с `Role.any()`
5. **Socket.IO** — каждое изменение → всем клиентам перерендер
6. **README.md** и **project_index.md** — обновлять при изменениях

---

## Запуск

### Dev Setup

```bash
npm run install:all
npm run dev
```

### Deploy

**Frontend** → Vercel: `npm run build`

**Backend** → Appwrite Cloud
