const { randomBytes } = require("node:crypto");
const mongoose = require("mongoose");
const session = require("express-session");

module.exports = async function (waw) {
	waw.mongoose = mongoose;

	// must have app from util.express
	const app = waw.app;
	if (!app) {
		throw new Error("util.mongo requires waw.app (call util.express first)");
	}

	const sessionMaxAge =
		typeof waw.config.session === "number"
			? waw.config.session
			: 365 * 24 * 60 * 60 * 1000;

	let store;

	// Build mongoUrl (same logic)
	if (waw.config.mongo) {
		const cfg = waw.config.mongo;

		// If user already provided a full URI, trust it (but still set waw.mongoUrl)
		if (typeof cfg === "string") {
			waw.mongoUrl = cfg;
		} else if (cfg.uri) {
			waw.mongoUrl = cfg.uri;
		} else {
			const protocol = cfg.srv ? "mongodb+srv://" : "mongodb://";

			// Credentials must be URL-encoded
			const user = cfg.user != null ? encodeURIComponent(String(cfg.user)) : "";
			const pass = cfg.pass != null ? encodeURIComponent(String(cfg.pass)) : "";
			const auth = user && pass ? `${user}:${pass}@` : "";

			// Hosts: support string, array, or host+port
			// - SRV: typically a single hostname, no port
			// - Non-SRV: can be "host:port" or multiple "h1:27017,h2:27017"
			let hosts = "";

			if (Array.isArray(cfg.hosts) && cfg.hosts.length) {
				hosts = cfg.hosts.join(",");
			} else if (typeof cfg.hosts === "string" && cfg.hosts.trim()) {
				hosts = cfg.hosts.trim();
			} else if (typeof cfg.host === "string" && cfg.host.trim()) {
				if (cfg.srv) {
					hosts = cfg.host.trim();
				} else {
					const port = cfg.port != null ? String(cfg.port) : "27017";
					// Allow host already containing ":port"
					hosts = cfg.host.includes(":") ? cfg.host.trim() : `${cfg.host.trim()}:${port}`;
				}
			} else {
				// Defaults
				hosts = cfg.srv ? "localhost" : `localhost:${cfg.port != null ? String(cfg.port) : "27017"}`;
			}

			// Database name (may be empty for some setups, but default to "test")
			const db = cfg.db != null ? String(cfg.db) : "test";

			// Build query options
			// Support either cfg.options object or direct top-level known keys
			const options = new URLSearchParams();

			const optObj = cfg.options && typeof cfg.options === "object" ? cfg.options : {};

			const setOpt = (key, val) => {
				if (val === undefined || val === null || val === "") return;
				options.set(key, String(val));
			};

			// Common options (top-level takes precedence over cfg.options)
			setOpt("replicaSet", cfg.replicaSet ?? optObj.replicaSet);
			setOpt("authSource", cfg.authSource ?? optObj.authSource);
			setOpt("readPreference", cfg.readPreference ?? optObj.readPreference);
			setOpt("retryWrites", cfg.retryWrites ?? optObj.retryWrites);
			setOpt("w", cfg.w ?? optObj.w);
			setOpt("directConnection", cfg.directConnection ?? optObj.directConnection);

			// TLS / SSL
			// Prefer "tls" (modern). Allow "ssl" for compatibility.
			const tls = cfg.tls ?? cfg.ssl ?? optObj.tls ?? optObj.ssl;
			if (tls !== undefined) {
				setOpt("tls", tls);
			}

			// Pass through any extra options from cfg.options (without overwriting explicit top-level keys)
			for (const [k, v] of Object.entries(optObj)) {
				if (!options.has(k) && v !== undefined && v !== null && v !== "") {
					options.set(k, String(v));
				}
			}

			const query = options.toString();
			waw.mongoUrl = `${protocol}${auth}${hosts}/${encodeURIComponent(db)}${query ? `?${query}` : ""}`;
		}
	}

	if (mongoose.connection.readyState === 0 && waw.mongoUrl) {
		mongoose.connection.on("error", (err) => {
			console.error("[mongo] connection error:", err);
		});

		mongoose.connection.on("connected", () => {
			console.log("[mongo] connected");
		});

		mongoose.connection.on("disconnected", () => {
			console.warn("[mongo] disconnected");
		});

		await waw.mongoose.connect(waw.mongoUrl);
	}

	// Session store (connect-mongo export compatibility)
	if (waw.mongoUrl) {
		const MongoStore = require("connect-mongo");

		store = (MongoStore?.default ?? MongoStore).create({ mongoUrl: waw.mongoUrl });
	}

	// Session middleware (same settings)
	const WEEK_MS = 7 * 24 * 60 * 60 * 1000, maxKeys = 5, now = Date.now();

	// Normalize to array of { key, createdAt }
	let secrets = (waw.config.secretKeys ?? [])
		.filter(Boolean)
		.map((s) => ({
			key: String(s.key),
			createdAt: Number(s.createdAt),
		}))
		.filter((s) => s.key && Number.isFinite(s.createdAt));

	// Create initial or rotate weekly based on newest item (index 0)
	const newest = secrets[0];
	const needsNew = !newest || (now - newest.createdAt) > WEEK_MS;

	if (needsNew) {
		secrets.unshift({
			key: randomBytes(32).toString("hex"),
			createdAt: now,
		});

		if (secrets.length > maxKeys) secrets = secrets.slice(0, maxKeys);

		const serverJson = waw.readJson(waw.configServerPath, {});
		serverJson.secretKeys = waw.config.secretKeys = secrets;
		waw.writeJson(waw.configServerPath, serverJson);
	}

	app.use(
		session({
			name: "express.sid." + (waw.config.prefix || ""),
			secret: secrets.map((s) => s.key),
			resave: false,
			saveUninitialized: false,
			cookie: {
				maxAge: sessionMaxAge,
				domain: waw.config.domain || undefined,
			},
			rolling: true,
			store,
		})
	);


	waw.store = store;
};
