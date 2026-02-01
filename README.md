
waw-sem is the server engine module of the waw framework. It provides the runtime pieces that turn a set of waw modules into a running backend: an Express HTTP server, optional MongoDB connection and session storage, Socket.IO real-time transport, and a declarative CRUD engine. When loaded, sem exposes `waw.app`, `waw.server`, and `waw.express`, provides `waw.router(basePath)` for mounting module routers, and sets common helpers such as `waw.ensure(req,res,next)` and `waw.role(roles, middleware)` for authorization. Sem also provides `waw.socket` with `io`, `emit(to, message, room?)`, and `add(fn)` to extend connection behavior, and it provides `waw.crud` to register CRUD behavior from module configuration and finalize route generation. At startup, sem loads every `*.collection.js` file from all modules (to register Mongoose models / schemas), then loads every `*.api.js` file (to register routes/endpoints), then calls `waw.crud.finalize()` to generate CRUD endpoints, and finally starts listening on `waw.config.port` (default `8080`).
```

---

## `server/sem/README.md` (rewrite + fixes)

This version keeps your existing sections but tightens language, updates structure names (you had `runner.js` in the doc but the module uses `cli.js`), and describes *exactly* what Sem exports / wires.

````md
# waw-sem

`waw-sem` is the **server engine module** of the waw framework. It wires together HTTP, database, CRUD, and sockets through the shared `waw` context so that modules can contribute backend behavior by adding convention-based files and configuration.

---

## What Sem Provides

### 🌐 HTTP server (Express)
Sem boots an Express app and Node HTTP server and exposes:

- `waw.app` — Express app instance
- `waw.server` — Node HTTP server (created from the Express app)
- `waw.express` — Express export
- `waw.router(basePath)` — creates and mounts an Express Router at `basePath`

It also installs common middleware:
- `cookie-parser`
- `method-override`
- query parsing into `req.queryParsed`

### 🧠 MongoDB + Sessions
If `waw.config.mongo` is present, Sem builds `waw.mongoUrl` and connects Mongoose, exposing:

- `waw.mongoose` — Mongoose instance
- `waw.mongoUrl` — resolved Mongo connection URI (when configured)
- session middleware using `express-session`
- optional Mongo-backed sessions via `connect-mongo` (when Mongo is configured)
- `waw.store` — session store instance (when enabled)

Sem maintains rotating session secret keys in `server.json` under `secretKeys` (supports key rotation with multiple active secrets).

### 🔌 Real-time sockets (Socket.IO)
Sem initializes Socket.IO on `waw.server` and exposes:

- `waw.socket.io` — Socket.IO server instance
- `waw.socket.emit(event, payload, room?)` — emit globally or to a room
- `waw.socket.add(fn)` — extend connection handlers

Default socket forwarding is provided for common CRUD events (`create`, `update`, `unique`, `delete`).

### 🧩 Convention-based module wiring
Sem turns modules into server behavior by loading:

- `*.collection.js` — loaded first (models/schemas registration)
- `*.api.js` — loaded after collections (route/API registration)

This allows modules to “plug in” by simply adding files with the correct suffix.

### 🗄 CRUD engine
Sem provides a CRUD generator and hook system through:

- `waw.crud.config(part, config)` — registers per-action rules/hooks
- `waw.crud.register(crudConfig, module, unique?)` — creates routes for a CRUD resource
- `waw.crud.finalize()` — scans all modules for `module.crud` and registers endpoints

Generated endpoints follow `/api/<crudName>/...` and include:
- `POST /create`
- `GET  /get`
- `POST /fetch`
- `POST /update`
- `POST /unique`
- `POST /delete`

Hooks are attached onto `waw` using predictable names (per crudName / action), supporting:
- `required_*` (required body fields)
- `ensure_*` (custom authorization / validation)
- `query_*` (query builder)
- `sort_*`, `skip_*`, `limit_*`
- `select_*`, `populate_*`

---

## Runtime Flow

When `server/sem/index.js` runs:

1. Express server is created (`util.express`)
2. Mongo + sessions are initialized if configured (`util.mongo`)
3. Socket.IO is initialized (`util.socket`)
4. CRUD engine is initialized (`util.crud`)
5. All `*.collection.js` files are loaded
6. All `*.api.js` files are loaded
7. `waw.crud.finalize()` registers CRUD routes from module configs
8. Server listens on `waw.config.port` (default `8080`)

---

## CLI

Sem provides module scaffolding:

- `waw add` / `waw a` — create a new module using the sem default module template (`server/sem/module/default`)

---

## Structure

```txt
server/sem/
├── cli.js              # CLI exports (thin)
├── index.js            # Sem runtime bootstrap
├── util.express.js     # Express + helpers
├── util.mongo.js       # Mongo connection + sessions
├── util.socket.js      # Socket.IO
├── util.crud.js        # CRUD generator + hooks
├── module.json         # Module manifest (deps + ordering)
└── module/default/     # Default module scaffold template
````

---

## License

MIT © Web Art Work
