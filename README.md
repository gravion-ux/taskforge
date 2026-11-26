<p align="center"><img src="assets/banner.svg" alt="taskforge banner" width="100%"/></p>

# TaskForge

[![CI](https://github.com/gravion-ux/taskforge/actions/workflows/ci.yml/badge.svg)](https://github.com/gravion-ux/taskforge/actions/workflows/ci.yml)

**A full-stack project & task management app — think a lean Trello/Asana clone — with projects, kanban boards, tasks, comments and role-based access control.**

**Author:** Priyanshu Kumar Thakur (Gravion) — github.com/gravion-ux

## Features

- **Authentication** — register/login with bcrypt-hashed passwords and JWT sessions
- **Role-based access** — global `admin` / `member` roles; project-level owner/member permissions
  (only owners manage members and board structure; only admins list all users/projects)
- **Projects** — create, rename, delete; invite members by email
- **Kanban boards** — one board per project with customisable columns
  (default: To Do → In Progress → In Review → Done)
- **Tasks** — CRUD, drag-and-drop between columns, assignees, labels, priorities
  (low/medium/high/urgent), due dates, ordering
- **Comments** — per-task discussion threads with author/owner delete rules
- **Validation & error handling** — centralised input validation and a single
  error-handling middleware with consistent JSON error responses

## Tech stack

| Layer    | Tech |
|----------|------|
| Backend  | Node.js, Express, MongoDB + Mongoose, JWT (jsonwebtoken), bcryptjs |
| Frontend | React 18, Vite, React Router, plain CSS (dark theme) |
| Tests    | Jest + supertest + mongodb-memory-server (API), Vitest + Testing Library (UI) |

## Project structure

```
taskforge/
├── server/                 # Express API
│   ├── src/
│   │   ├── app.js          # app factory (used by tests too)
│   │   ├── index.js        # entry point (DB connect + listen)
│   │   ├── models/         # User, Project, Board, Task, Comment
│   │   ├── routes/         # auth, projects, boards, tasks (+ comments)
│   │   ├── middleware/     # authRequired, requireRole, projectMember, projectOwner
│   │   └── utils/          # validation helpers, ApiError + error handler
│   └── tests/              # Jest API tests (in-memory MongoDB)
└── client/                 # React app (Vite)
    └── src/
        ├── api/client.js   # fetch wrapper + all API calls
        ├── pages/          # Login, Register, Dashboard, ProjectBoard
        └── components/     # TaskModal (task detail + comments)
```

## How to run

### 1. Backend

```bash
cd server
cp .env.example .env        # set JWT_SECRET to a long random string
npm install
npm start                   # API on http://localhost:5000
```

Requires a MongoDB instance — either a local one (`mongodb://127.0.0.1:27017/taskforge`,
the default in `.env.example`) or a MongoDB Atlas URI in `MONGO_URI`.

The **first registered account automatically becomes an admin** so a fresh
install is usable; later accounts are members unless an admin creates them as admins.

### 2. Frontend

```bash
cd client
npm install
npm run dev                 # UI on http://localhost:5173 (proxies /api to :5000)
```

For a production build: `npm run build` (output in `client/dist/`). If the API
runs on another origin, set `VITE_API_URL` at build time.

## API summary

All routes except register/login require `Authorization: Bearer <token>`.

| Method | Route | Notes |
|--------|-------|-------|
| POST | `/api/auth/register` | body: name, email, password |
| POST | `/api/auth/login` | returns `{ token, user }` |
| GET  | `/api/auth/me` | current user |
| GET  | `/api/auth/users` | **admin only** — user list for pickers |
| GET/POST | `/api/projects` | list visible projects / create (+ default board) |
| GET/PATCH/DELETE | `/api/projects/:id` | PATCH/DELETE: owner only |
| POST/DELETE | `/api/projects/:id/members[/:userId]` | owner only, add by email |
| GET  | `/api/projects/:id/board` | board + all tasks |
| POST/PATCH/DELETE | `/api/projects/:id/board/columns[/:colId]` | owner only |
| POST | `/api/projects/:id/tasks` | body: title, columnId, … |
| GET/PATCH/DELETE | `/api/projects/:id/tasks/:taskId` | PATCH handles column moves (`columnId`, `position`) |
| GET/POST | `/api/projects/:id/tasks/:taskId/comments` | |
| DELETE | `/api/projects/:id/tasks/:taskId/comments/:commentId` | author, project owner or admin |

Errors are JSON: `{ "error": "message" }` with a matching HTTP status
(400 validation, 401 auth, 403 forbidden, 404 not found, 409 conflict).

## Tests

```bash
# Backend API tests — spin up a real in-memory MongoDB, no local Mongo needed
cd server && npm test        # 14 tests

# Frontend smoke tests
cd client && npm test        # 3 tests

# Frontend production build
cd client && npm run build
```

## License

MIT
