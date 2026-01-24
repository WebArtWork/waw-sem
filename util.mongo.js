const mongoose = require("mongoose");
const session = require("express-session");

module.exports = function (waw) {
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
		let mongoAuth = "";
		if (waw.config.mongo.user && waw.config.mongo.pass) {
			mongoAuth = waw.config.mongo.user + ":" + waw.config.mongo.pass + "@";
		}
		waw.mongoUrl =
			"mongodb://" +
			mongoAuth +
			(waw.config.mongo.host || "localhost") +
			":" +
			(waw.config.mongo.port || "27017") +
			"/" +
			(waw.config.mongo.db || "test");
	}

	// Connect once if not connected
	if (waw.mongoose.connection.readyState == 0 && waw.mongoUrl) {
		waw.mongoose.connect(waw.mongoUrl, {
			// keep old options commented
		});

		waw.mongoose.Promise = global.Promise;
	}

	// Session store (connect-mongo export compatibility)
	if (waw.mongoUrl) {
		let MongoStore = require("connect-mongo");

		// ESM interop: sometimes it's under `.default`
		MongoStore = MongoStore && MongoStore.default ? MongoStore.default : MongoStore;

		// Very old versions: connect-mongo(session) -> Store class
		if (typeof MongoStore === "function" && !MongoStore.create) {
			MongoStore = MongoStore(session);
		}

		// v5/v6: MongoStore.create(...)
		if (MongoStore && typeof MongoStore.create === "function") {
			store = MongoStore.create({ mongoUrl: waw.mongoUrl });
		} else {
			// fallback: constructor style (some variants)
			store = new MongoStore({ mongoUrl: waw.mongoUrl });
		}
	}

	// Session middleware (same settings)
	app.use(
		session({
			key: "express.sid." + waw.config.prefix,
			secret: "thisIsCoolSecretFromWaWFramework" + waw.config.prefix,
			resave: false,
			saveUninitialized: true,
			cookie: {
				maxAge: sessionMaxAge,
				domain: waw.config.domain || undefined,
			},
			rolling: true,
			store: store,
		})
	);

	waw.store = store;
};
