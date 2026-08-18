# waw-sem

**waw-sem** is the server engine module for the waw platform. It wires together an Express HTTP server, optional MongoDB connection + session middleware, Socket.IO transport, and a convention-driven CRUD generator. Sem exposes its runtime API through the shared `waw` context so other modules can contribute backend behavior by adding `*.collection.js`, `*.api.js`, and/or `module.crud` configuration.

> 🤖 **AI agents:** read [`AI_INSTRUCTIONS.md`](AI_INSTRUCTIONS.md) first — it is the agent-oriented working guide for this module (conventions to follow, how to extend it, and gotchas to avoid). This README is the human reference.

---

## What Sem Does at Runtime

When [`index.js`](index.js) runs, it performs these steps in order:

1. Initializes Express + HTTP server, base middleware, and auth helpers ([`util.express`](util.express.js))
2. Initializes MongoDB + the rotating session middleware ([`util.mongo`](util.mongo.js)) — `await`ed
   - Builds `waw.mongoUrl` and connects Mongoose if `waw.config.mongo` is configured
   - Always installs the store-backed `express-session` middleware (store only when connected)
3. Initializes Socket.IO ([`util.socket`](util.socket.js))
4. Initializes the CRUD engine ([`util.crud`](util.crud.js))
5. Loads every module file ending with `collection.js` (in module order), `await require(file)(waw)`
6. Loads every module file ending with `api.js` (in module order), `await require(file)(waw)`
7. Calls `waw.crud.finalize()` to register CRUD endpoints from module configs
8. Registers a global Express error-handling middleware that maps validation, cast, and duplicate-key failures to `422`, `400`, and `409`; unexpected failures are logged and respond `500` with `waw.resp(false)`
9. Registers a `process.on('unhandledRejection')` safety-net handler
10. Starts listening on `waw.config.port` (defaults to `8080`)

---

## Exposed API on `waw`

### Express / HTTP
`util.express.js` creates and exposes:

- `waw.app` — Express app
- `waw.server` — Node HTTP server created from the Express app
- `waw.express` — Express export
- `waw.cors` — the `cors` package export (for use by other modules)
- `waw.router(basePath)` — mounts an Express Router at `basePath` and returns it

Built-in routes / middleware (installed in this order):

- Optional favicon if `waw.config.icon` points to an existing file
- CORS preflight: `app.options(/.*/, cors())`
- `app.set('trust proxy', 1)`
- An initial `express-session` (secret `waw.config.sessionSecret` or `'Web Art Work Secret'`; cookie `httpOnly`, `sameSite: 'none'`, `secure: true`). A second, store-backed session is installed later by `util.mongo` (see below).
- `cookie-parser`
- `method-override("X-HTTP-Method-Override")`
- `express.json({ limit: '10mb' })`
- `express.urlencoded({ extended: true, limit: '10mb' })`
- `GET /status` — returns HTTP 200 with `true`

Auth helpers:

- `waw.ensure(req,res,next)` — requires `req.user` or responds with `waw.resp(false)`
- `waw.role(roles, middleware?)` — role gating based on `req.user.is[role]`, responds `401` with `false` on failure
- `waw.next` and `waw.block` convenience helpers

> Note: `util.express` defines `waw.resp = (body) => body` as a minimal default; CRUD uses `waw.resp(...)` when sending JSON responses.

---

### MongoDB + Sessions
`util.mongo.js` sets:

- `waw.mongoose` — Mongoose instance
- `waw.mongoUrl` — resolved Mongo connection string when Mongo is configured
- `waw.mongoConnected` — boolean reflecting whether the connection succeeded
- `waw.store` — Connect-Mongo session store, set only when the connection succeeds (otherwise `undefined`)

Mongo configuration behavior:

- If `waw.config.mongo` is a string, it is treated as the full Mongo URI.
- If it has a `uri` field, that is used directly.
- Otherwise Sem builds a URI from keys such as `srv` (chooses `mongodb+srv://`), `host`/`hosts`, `port`, `user`/`pass` (URL-encoded), `db` (default `test`), and optional query options (via an `options` object or top-level fields like `replicaSet`, `authSource`, `readPreference`, `retryWrites`, `w`, `directConnection`, `tls`/`ssl`).
- `mongoose.set('bufferCommands', false)` is applied. If a URL exists and Mongoose is not already connected, Sem connects with `serverSelectionTimeoutMS: 5000` and logs `connected`/`error`/`disconnected` events. **If the connection fails, the server keeps running without MongoDB** — Mongo-dependent features will then error.

Sessions behavior (the store-backed session installed by `util.mongo`, in addition to the initial one from `util.express`):

- Installs `express-session` with `rolling: true` and the Connect-Mongo `store` (when connected).
- Cookie `maxAge` defaults to one year unless `waw.config.session` is a number (interpreted as milliseconds).
- Cookie `domain` uses `waw.config.domain` when provided.
- Session name is `express.sid.<prefix>` where `<prefix>` is `waw.config.prefix` or empty.
- Secret rotation is maintained in the project’s `server.json` (`waw.configServerPath`) under `secretKeys` as an array of `{ key, createdAt }`; the full list is passed as the session `secret` array.
  - A new 32-byte hex secret is generated if there is no secret or the newest is older than one week.
  - Up to 5 recent secrets are kept to allow rotation without invalidating existing sessions.

---

### Socket.IO
`util.socket.js` creates a Socket.IO server on `waw.server` and exposes:

- `waw.socket.io` — Socket.IO server instance
- `waw.socket.emit(event, payload, room?)` — emits globally or to a room
- `waw.socket.add(fn)` — adds a connection handler `(socket) => { ... }`

Defaults:

- CORS allows any origin (`origin: "*"`)
- Transports: `websocket` and `polling`
- On connection, a default handler forwards `create`, `update`, `unique`, `delete` events to all other clients via `socket.broadcast.emit(...)`.

---

## CRUD Engine

`util.crud.js` provides:

- `waw.crud.config(part, config)` — registers hooks and rules for CRUD actions into the `waw` object under predictable names
- `waw.crud.register(crud, part, unique = true)` — mounts endpoints under `/api/<crudName>` and wires hooks
- `waw.crud.finalize()` — scans `waw.modules[*].crud` and registers CRUD endpoints for each configured resource

### Endpoint set
For each CRUD resource named `<crudName>`, Sem mounts routes under `/api/<crudName>`. Which routes are mounted depends on the resource config:

- `/create` (POST) — always
- `/get...` (GET; supports named variants) — `get` defaults to a single unnamed `/get` when not configured
- `/fetch...` (POST; supports named variants) — `fetch` defaults to a single unnamed `/fetch`
- `/update...` (POST; supports named variants) — only when `crud.update` is an object/array; each entry lists the `keys` it may modify
- `/unique...` (POST; supports named variants) — only when `crud.unique` is an object/array
- `/delete...` (POST; supports named variants) — only when `crud.delete` is set

Default queries scope reads/writes by `moderators: req.user._id` (and `author` for delete). `create`, `update`, and `delete` broadcast a socket event via `waw.emit('<crudName>_create' | '_update' | '_delete', doc)`.

### Hook wiring
`waw.crud.config(part, config)` reads per-action config objects and stores behavior on `waw` using names like:

- `required_<action>_<part>[_<name>]` (array of required body fields)
- `ensure_<action>_<part>[_<name>]` (custom ensure middleware)
- `query_<action>_<part>[_<name>]`
- `sort_<action>_<part>[_<name>]`, `skip_...`, `limit_...`
- `select_...`, `populate_...`

At request time, Sem uses these to validate required fields, authorize access, and modify query behavior.

### Models / schema resolution
When registering a resource, Sem resolves a Mongoose model as:

- `waw.<CrudCapitalName>` if already present on `waw`, otherwise
- `require(<moduleRoot>/schema.js)` (or `schema_<crudName>.js` when `unique=false`)

If the required schema export is a function without a name, it is invoked as `Schema(waw)`. If the schema file cannot be found (`MODULE_NOT_FOUND`), the resource is logged and skipped rather than crashing the server.

A default schema is shipped at [`schema.js`](schema.js) (`name`, `description`, `author`, `moderators`, `url`, plus a `create(obj, user, waw)` method) and uses the `CNAME` model-name token.

---

## Convention-based Module Wiring

Sem loads files from all modules based on filename suffix:

- `*.collection.js` — loaded first (intended for model/schema registration)
- `*.api.js` — loaded second (intended for mounting routes/endpoints)

Each such file is required and invoked as `await require(file)(waw)`.

---

## CLI

Sem exposes a module scaffolding command via `server/sem/cli.js`:

- `waw add <module>` / `waw a <module>` — creates a module under the project modules directory using the Sem template (`server/sem/module/default/scaffold.js`)

---

## Module Manifest

Sem is defined by `server/sem/module.json`:

- `after: "core"` and `before: "*"` to ensure it runs after core but before other modules by default
- Installs dependencies: `cors`, `express`, `express-session`, `mongoose`, `connect-mongo`, `formidable`, `method-override`, `serve-favicon`, `cookie-parser`, `socket.io`, and `marked`

---

## License

MIT © Web Art Work
