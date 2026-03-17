# 🚀 Migration Guide: Backend на Appwrite SDK

## 1. ✅ Что сделано

- `backend/server.js` — переписан на Appwrite SDK (вместо Sequelize)
- `backend/package.json` — обновлены зависимости (удалены Sequelize, SQLite, PostgreSQL)
- `backend/.env.example` — новые env vars для Appwrite
- `appwrite-functions/` — уже готовы к развертыванию

---

## 2. 📋 Шаги настройки

### 2.1 Обновить backend зависимости

```bash
cd backend
npm install
```

### 2.2 Создать `.env` файл в backend

```bash
cp .env.example .env
```

Заполнить значениями:

```env
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Appwrite credentials (получить из Appwrite Console)
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=ваш-project-id
APPWRITE_API_KEY=ваш-api-key (с нужными permissions)
APPWRITE_DATABASE_ID=ваш-database-id
APPWRITE_COLLECTION_ID=ваш-collection-id
```

### 2.3 Запустить backend

```bash
npm run dev
```

Должно появиться:

```
✅ Appwrite connection OK
⏰ Auto-trash check: every 1 minute
🕐 Trash purge check: every 1 hour
🌐 Socket.IO relay server listening on port 3000
```

### 2.4 Развернуть Appwrite Functions на Appwrite Cloud

#### Вариант A: Через Appwrite Console

1. Перейди в Appwrite Console → Functions
2. Create Function → Node.js 18+
3. Назови `auto-trash`
4. Скопируй код из `appwrite-functions/auto-trash/index.js`
5. Set env vars:
   - `APPWRITE_API_KEY` = твой API key
   - `DATABASE_ID` = твой database ID
   - `COLLECTION_ID` = твой collection ID
6. Deploy
7. Setup Cron trigger: `*/1 * * * *` (каждую минуту)

Повтори шаги 2-7 для `purge-trash` function:

- Код из `appwrite-functions/purge-trash/index.js`
- Cron trigger: `0 * * * *` (каждый час)

#### Вариант B: Через CLI (если используешь Appwrite CLI)

```bash
# Deploy auto-trash
cd appwrite-functions/auto-trash
appwrite deploy --functionId auto-trash

# Deploy purge-trash
cd ../purge-trash
appwrite deploy --functionId purge-trash
```

---

## 3. 🧪 Проверка работы

### Тест 1: Backend подключается к Appwrite

```bash
curl http://localhost:3000/health
```

Ожидаемо:

```json
{
	"status": "ok",
	"type": "Socket.IO relay + Appwrite",
	"timestamp": "2026-03-17T...",
	"database": "Appwrite Cloud"
}
```

### Тест 2: Socket.IO работает

Скопируй задачу:

1. Открой приложение на десктопе и мобильном
2. Добавь задачу на мобиле
3. **На десктопе должна появиться она же в реальном времени**

### Тест 3: Auto-trash работает

1. Отметь задачу как выполненную
2. Подожди 1 минуту (backend проверяет каждую минуту)
3. **Задача должна переместиться в Done/Trash**

### Тест 4: Purge-trash работает

1. Удали задачу (soft-delete)
2. Подожди 24 часа для реального теста **ИЛИ**
3. Измени в backend коде `TRASH_TTL_MS` на 30 сек для тестирования:

```javascript
const TRASH_TTL_MS = 30 * 1000; // 30 сек для теста
```

Затем перезагрузи backend и удали задачу. Через 30 сек она удалится полностью.

---

## 4. 🎯 Как всё работает теперь

```
  Desktop Browser          Mobile Browser
       ↓                         ↓
  ┌─────────────────────────────────────┐
  │   Appwrite Databases (Cloud)         │
  │  - Все операции (add/edit/delete)    │
  │  - Real-time subscriptions на фронте  │
  └─────────────────────────────────────┘
       ↓              ↑              ↓
    Прямо в          │         Прямо в
   Appwrite      Socket.IO relay   Appwrite
       ↓          (backend)          ↓
     Фронт connect к Appwrite   connect к Appwrite

Backend роль:
- Поллит Appwrite каждую минуту для auto-trash (completed → trash)
- Поллит Appwrite каждый час для purge (deleted → permanent)
- Ретранслирует `tasks:update` события через Socket.IO
- Фронт слушает это и ре-рендерит для синхронизации между табами
```

---

## 5. ⚠️ Возможные проблемы

### "❌ Missing APPWRITE_DATABASE_ID"

Решение: Добавь env vars в backend/.env

### "❌ Auto-trash error: Appwrite error"

Решение: Проверь что APPWRITE_API_KEY имеет правильные permissions

### "Таски не синхронизируются между табами"

Решение:

1. Проверь что Socket.IO сервер запущен (`npm run dev` в backend)
2. Проверь что фронтенд подключается к Socket.IO (консоль браузера должно быть "Socket connected")
3. Перезагрузи страницу

---

## 6. 📝 Что удалить

После успешной миграции можешь удалить:

```bash
rm backend/models/Task.js
rm backend/migrate.js
rm backend/server-old.js (старый файл)
rm backend/database.sqlite (если был)
```

---

## 7. 🚀 Deploy на production

### Frontend (Vercel)

```bash
cd frontend
npm run build
# Деплой dist/ на Vercel
```

### Backend (Render или indy хостинг)

Хостинг должен поддерживать:

- Node.js 18+
- Environment variables
- Socket.IO WebSockets

Env vars на хостинге:

```
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=...
APPWRITE_API_KEY=...
APPWRITE_DATABASE_ID=...
APPWRITE_COLLECTION_ID=...
FRONTEND_URL=https://сой-frontend.vercel.app
PORT=3000
NODE_ENV=production
```

### Appwrite Functions

Функции живут на **Appwrite Cloud**. Нет нужно их деплоить отдельно — они уже там.

---

## ✅ Готово!

Теперь система работает:

1. ✅ Real-time sync между устройствами (Appwrite + Socket.IO)
2. ✅ Auto-trash completed tasks (backend polling или Appwrite Function)
3. ✅ Auto-purge deleted tasks (backend polling или Appwrite Function)
4. ✅ No SQLite/PostgreSQL — всё на Appwrite Cloud
