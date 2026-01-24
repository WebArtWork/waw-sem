# waw-sem

`waw-sem` is the **server engine module** of the waw framework.
It provides HTTP routing, API composition, CRUD generation, database integration, sessions, and real-time sockets — all wired together through the global `waw` object.

Sem is responsible for **turning modules into a running server**.

---

## Core Responsibilities

### 🌐 HTTP & Routing
- Express-based server bootstrap
- Middleware pipeline (`waw.use`)
- Dynamic routing via `waw.router()`
- Page, API, and app dispatching
- Subdomain-aware routing

### 🧩 API Composition
- `waw.api({...})` for registering:
  - REST endpoints
  - Pages
  - Templates
  - Static apps
- Supports dynamic routes (`/:id`)
- Domain and subdomain separation

### 🗄 CRUD Engine
- Declarative CRUD via `module.json`
- Auto-generated endpoints:
  - create / get / fetch / update / unique / delete
- Hook system:
  - `required_*`
  - `ensure_*`
  - `query_*`
  - `sort / skip / limit / select / populate`
- Mongoose-based schemas

### 🧠 MongoDB & Sessions
- Mongoose integration
- Optional Mongo-backed sessions via `connect-mongo`
- Automatic connection handling

### 🔌 Real-time Sockets
- Socket.IO integration
- Default CRUD event broadcasting
- Extendable via `waw.socket.add(fn)`
- Room and global emits

---

## Architecture Overview

```

server/sem/
├── index.js            # Loads sem engine parts
├── runner.js           # CLI commands (thin)
├── util.express.js     # Express + HTTP + helpers
├── util.mongo.js       # MongoDB + sessions
├── util.socket.js      # Socket.IO
├── util.api.js         # API composition & dispatch
├── util.crud.js        # CRUD engine
├── crud.wjst.js        # Client-side CRUD helper (WJST)
├── module/
│   └── default/        # Default module generator
└── *.api.js / *.collection.js (user modules)

````

---

## Usage

Sem is **not installed via npm**.
It is added and managed through the waw CLI:

```sh
waw add waw-sem
```

Sem is loaded automatically based on module priority and provides server capabilities to all modules.

---

## Module Integration

Modules can contribute to sem by providing:

* `*.api.js` — API definitions
* `*.collection.js` — Mongoose schemas
* `crud` section in `module.json`
* WJST templates and pages

Sem detects and wires these automatically at runtime.

---

## Development Notes

* Sem is designed to run on **Linux-first**, but supports Windows and macOS.
* Avoid hardcoded Express routes — always use `waw.router()` or `waw.api()`.
* Keep logic attached to `waw` for maximum reuse.

---

## License

MIT © Web Art Work
