const path = require("node:path");
const express = require("express");
const http = require("http");
const favicon = require("serve-favicon");
const cookieParser = require("cookie-parser");
const methodOverride = require("method-override");

module.exports = function (waw) {
	const app = express();
	const server = http.createServer(app);

	app.get("/status", (req, res) => {
		res.status(200).send(true);
	});

	// expose basics
	waw.app = app;
	waw.server = server;
	waw.express = express;

	/*
	 *	Favicon
	 */
	if (waw.config.icon) {
		const iconPath = path.join(process.cwd(), waw.config.icon);
		if (waw.exists(iconPath)) {
			app.use(favicon(iconPath));
		}
	}

	/*
	 *	Base middleware
	 */
	app.use(cookieParser());
	app.use(methodOverride("X-HTTP-Method-Override"));
	app.use(express.json({ limit: '10mb' }));
	app.use(express.urlencoded({ extended: true, limit: '10mb' }));


	/*
	 *	Helpers
	 */
	waw.router = function (api) {
		const router = express.Router();

		app.use(api, router);

		return router;
	};

	/*
	 *	Auth/roles helpers (same as original)
	 *	Note: waw.ensure depends on waw.resp (set by crud.js usually).
	 */
	waw.resp = function (body) {
		return body;
	};
	waw.ensure = (req, res, next) => {
		if (req.user) next();
		else res.json(waw.resp(false));
	};

	waw.role = function (roles, middleware) {
		if (typeof roles === "function") {
			middleware = roles;
			roles = "";
		}

		if (typeof roles === "string") {
			roles = roles.split(" ");
		}

		return function (req, res, next) {
			if (req.user && !roles[0]) {
				if (middleware) middleware(req, res, next);
				else next();
				return;
			} else if (req.user && req.user.is) {
				for (const role of roles) {
					if (req.user.is[role]) {
						if (middleware) middleware(req, res, next);
						else next();
						return;
					}
				}
			}

			res.status(401).json(false);
		};
	};

	waw.next = (req, res, next) => next();
	waw.block = (req, res) => res.send(false);
};
