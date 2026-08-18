# waw-sem — AI agent guide

**Purpose:** the server engine. It turns an ordered set of modules into a running backend by initializing Express + HTTP, optional MongoDB + sessions, Socket.IO, and a convention-based CRUD engine, all exposed through the shared `waw` context.

## How a backend module contributes (the conventions to follow)
At startup `index.js` loads, in module order, every file ending with `collection.js` first, then every file ending with `api.js`, each invoked as `await require(file)(waw)`. So:
- Put model/schema registration in a `*.collection.js` (sets `waw.<CapitalName>` or exports a Mongoose model).
- Put route mounting in a `*.api.js` using `waw.router(basePath)`.
- Declarative CRUD goes in the module's `module.json` `crud` config; `waw.crud.finalize()` registers it after all files load.

## Key `waw` API to use
- HTTP: `waw.app`, `waw.server`, `waw.express`, `waw.cors`, `waw.router(basePath)`.
- Auth/guards: `waw.ensure(req,res,next)` (requires `req.user`), `waw.role(roles, middleware?)` (gates on `req.user.is[role]`), plus `waw.next` / `waw.block`. `waw.resp(body)` is the JSON wrapper used by responses.
- Mongo: `waw.mongoose`, `waw.mongoUrl`, `waw.mongoConnected`, `waw.store`. Config via `waw.config.mongo` (string URI, `{uri}`, or builder fields `srv/host/hosts/port/user/pass/db/options`).
- Sockets: `waw.socket.io`, `waw.socket.emit(event, payload, room?)`, `waw.socket.add(fn)`.
- CRUD: `waw.crud.config(part, config)` registers per-action hooks (`required`, `ensure`, `query`, `sort`, `skip`, `limit`, `select`, `populate`) stored on `waw` as `<hook>_<action>_<part>[_<name>]`; `waw.crud.register(crud, part, unique?)` mounts `/api/<crudName>/{create,get,fetch,update,unique,delete}`.

## Behavior to keep in mind
- The server keeps running even if MongoDB fails to connect (connect timeout 5s, `bufferCommands` off) — Mongo-dependent routes will then error.
- Session middleware is installed twice: an initial one in `util.express` and the store-backed, weekly-rotating one in `util.mongo` (secrets persisted in `server.json` under `secretKeys`, max 5).
- CRUD endpoints are conditional on config; default queries scope by `moderators`/`author` of `req.user`; create/update/delete emit `waw.emit('<crudName>_<action>', doc)`.
- A missing schema file logs a warning and skips that resource instead of crashing. CRUD routes return `404` for missing documents and `422` for missing required fields. The global error middleware maps Mongoose validation, cast, and duplicate-key errors to `422`, `400`, and `409`; unexpected failures return `500` with `waw.resp(false)`.
- Default listen port is `8080` (`waw.config.port`). Body limit is 10mb.

## CLI
- `waw add <module>` / `waw a` — scaffold a backend module into the project's modules dir from `module/default/` (provides `collection.js` + `api.js` + `module.json` starters).
