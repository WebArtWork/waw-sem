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
			// useUnifiedTopology: true,
			// useNewUrlParser: true,
			// useCreateIndex: true
		});

		waw.mongoose.Promise = global.Promise;
	}

	// Session store
	if (waw.mongoUrl) {
		const MongoStore = require("connect-mongo");
		store = MongoStore.create({ mongoUrl: waw.mongoUrl });
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
