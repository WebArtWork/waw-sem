# waw-sem

**waw-sem** is the server engine module for the waw platform. It wires together an Express HTTP server, optional MongoDB connection + session middleware, Socket.IO transport, and a convention-driven CRUD generator. Sem exposes its runtime API through the shared `waw` context so other modules can contribute backend behavior by adding `*.collection.js`, `*.api.js`, and/or `module.crud` configuration.

---

## What Sem Does at Runtime

When `server/sem/index.js` runs, it performs these steps in order:

1. Initializes Express + HTTP server (`util.express`)
2. Initializes MongoDB + sessions (`util.mongo`)
   - Connects Mongoose if `waw.config.mongo` is configured
   - Always installs `express-session` middleware
3. Initializes Socket.IO (`util.socket`)
4. Initializes CRUD engine (`util.crud`)
5. Loads every module file ending with `collection.js` (in module order)
6. Loads every module file ending with `api.js` (in module order)
7. Calls `waw.crud.finalize()` to register CRUD endpoints from module configs
8. Starts listening on `waw.config.port` (defaults to `8080`)

---

## Exposed API on `waw`

### Express / HTTP
`util.express.js` creates and exposes:

- `waw.app` — Express app
- `waw.server` — Node HTTP server created from the Express app
- `waw.express` — Express export
- `waw.router(basePath)` — mounts an Express Router at `basePath` and returns it

Built-in routes / middleware:

- `GET /status` — returns HTTP 200 with `true`
- `cookie-parser`
- `method-override("X-HTTP-Method-Override")`
- `req.queryParsed` — parsed query string params copied into an object
- Optional favicon if `waw.config.icon` points to an existing file

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
- `waw.store` — session store instance when Mongo is configured (Connect-Mongo), otherwise `undefined`

Mongo configuration behavior:

- If `waw.config.mongo` is a string, it is treated as the full Mongo URI.
- If it is an object, Sem supports building a URI from keys such as `srv`, `uri`, `host/hosts`, `port`, `user/pass`, `db`, and optional query options (via `options` object or top-level fields like `replicaSet`, `authSource`, `readPreference`, etc.).
- If `waw.mongoUrl` exists and Mongoose is not connected, Sem connects and logs basic connection events.

Sessions behavior:

- Installs `express-session` middleware.
- Cookie max age defaults to one year unless `waw.config.session` is a number.
- Cookie `domain` uses `waw.config.domain` when provided.
- Session name is `express.sid.<prefix>` where `<prefix>` is `waw.config.prefix` or empty.
- Secret rotation is maintained in the project’s `server.json` under `secretKeys` as an array of `{ key, createdAt }`.
  - A new secret is generated if there is no secret or the newest secret is older than one week.
  - Up to 5 recent secrets are kept to allow rotation without breaking existing sessions.

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
For each CRUD resource named `<crudName>`, Sem mounts routes under:

- `/api/<crudName>/create` (POST)
- `/api/<crudName>/get...` (GET; supports named variants)
- `/api/<crudName>/fetch...` (POST; supports named variants)
- `/api/<crudName>/update...` (POST; supports named variants)
- `/api/<crudName>/unique...` (POST; supports named variants)
- `/api/<crudName>/delete...` (POST; supports named variants)

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

If the required schema export is a function without a name, it is invoked as `Schema(waw)`.

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
- Installs dependencies including `express`, `mongoose`, `express-session`, `connect-mongo`, `socket.io`, and others used by its utilities

---

## License

MIT © Web Art Work
