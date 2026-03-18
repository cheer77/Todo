# 📇 Premium To-Do List — Project Index

## Overview

Full-stack To-Do app с **glassmorphism**-дизайном, real-time синхронизацией (Appwrite Realtime), PWA, drag-and-drop и «умной корзиной». Архитектура полностью переведена на **Appwrite Cloud (BaaS)**.

| Layer               | Stack                                                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------------------------ |
| Frontend            | Vanilla JS (ES Modules), Vite 7, Sass (Sass), Appwrite SDK, `@lottiefiles/dotlottie-web`                     |
| Backend (BaaS)      | Appwrite Cloud (Database, Realtime, Functions)                                                               |
| Automation          | Appwrite Functions (cron triggers для auto-trash и purge-trash)                                              |
| Deploy              | Vercel (frontend), Appwrite Cloud (backend + functions + database)                                           |

> [!CAUTION]
> **Запрещено** использовать React, Vue, Angular, Svelte. Строго **Vanilla JavaScript**.

---

## File Tree

```
Todo/
├── package.json              ← Root entry (frontend scripts)
├── vercel.json               ← Vercel deploy config (frontend SPA)
├── .ai-context.md            ← AI правила и архитектурный контракт
├── README.md                 ← Основная документация
├── MIGRATION.md              ← Статус миграции
├── project_index.md          ← Этот файл
│
├── appwrite-functions/       ← Serverless функции Appwrite
│   ├── auto-trash/           ← Cron: перемещает completed(>4м) в корзину
│   │   └── index.js          
│   └── purge-trash/          ← Cron: удаляет deleted(>4м) навсегда
│       └── index.js          
│
├── frontend/
│   ├── package.json          ← vite 7, sass, appwrite SDK, dotlottie-web
│   ├── vite.config.js        ← Vite конфиг
│   ├── index.html            ← Главная HTML-страница
│   ├── public/
│   │   ├── sw.js             ← Service Worker (optimized for Appwrite)
│   │   └── ...
│   └── src/
│       ├── js/
│       │   ├── appwrite.js       ← Client инициализация
│       │   ├── main.js           ← Главный контроллер (Real-time + Logic)
│       │   └── modules/
│       │       ├── Store.js      ← Appwrite Databases wrapper
│       │       ├── TaskItem.js   ← DOM-фабрика
│       │       ├── TrashTimer.js ← SVG ring countdown (precision fix)
│       │       └── ...
│       └── scss/
│           └── ...
```

---

## Data Model — `Task` Collection

| Атрибут       | Тип      | Default | Описание                                                |
| ------------- | -------- | ------- | ------------------------------------------------------- |
| `text`        | String   | —       | Текст задачи (до 1500 символов)                         |
| `completed`   | Boolean  | `false` | Статус выполнения                                       |
| `order`       | Integer  | `0`     | Порядок (Desc sort для All, новые задачи сверху)        |
| `isDeleted`   | Boolean  | `false` | Soft-delete флаг (для Trash)                            |
| `deletedAt`   | DateTime | `null`  | Время удаления (для 4м TTL purge)                       |
| `completedAt` | DateTime | `null`  | Время выполнения (для 4м auto-trash)                    |

---

## Appwrite Configuration

### Real-time Sync
Синхронизация между устройствами происходит напрямую через **Appwrite Realtime** (`client.subscribe`). При любом изменении документа (create/update/delete) фронтенд получает событие и выполняет debounced-перерендер.

### Service Worker (v5)
Оптимизирован для Appwrite: исключает `appwrite.io` из кэша, чтобы данные всегда были актуальными даже в PWA режиме на мобильных устройствах.

---

## Правила разработки

1. **Модуль `Store`** — единственная точка доступа к Appwrite.
2. **Real-time** — подписка на коллекцию в `main.js` обеспечивает sync всех клиентов.
3. **Ordering** — новые задачи добавляются с `maxOrder + 1` и отображаются первыми за счет `Query.orderDesc('order')`.
4. **TTLs** — для тестирования установлены интервалы в **4 минуты**.
