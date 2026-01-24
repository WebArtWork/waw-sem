const fs = require("fs");
const express = require("express");
const http = require("http");
const favicon = require("serve-favicon");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const methodOverride = require("method-override");

module.exports = function (waw) {
	const app = express();
	const server = http.Server(app);

	// expose basics
	waw.app = app;
	waw.server = server;
	waw.express = express;

	/*
	 *	Favicon
	 */
	if (waw.config.icon && fs.existsSync(process.cwd() + waw.config.icon)) {
		app.use(favicon(process.cwd() + waw.config.icon));
	}

	/*
	 *	Base middleware
	 */
	app.use(cookieParser());
	app.use(methodOverride("X-HTTP-Method-Override"));

	app.use(
		bodyParser.urlencoded({
			extended: "true",
			limit: "50mb",
		})
	);

	app.use(
		bodyParser.json({
			limit: "50mb",
		})
	);

	/*
	 *	Query parsing into req.queryParsed (same behavior)
	 */
	app.use((req, res, next) => {
		req.queryParsed = {};

		try {
			const protocol = req.secure ? "https" : "http";
			const url = new URL(req.originalUrl, `${protocol}://${req.headers.host}`);
			for (const [key, value] of url.searchParams.entries()) {
				req.queryParsed[key] = value;
			}
		} catch {
			req.queryParsed = {};
		}

		next();
	});

	/*
	 *	Start server
	 */
	if (!waw.config.port) waw.config.port = 8080;

	server.listen(waw.config.port);

	console.log("App listening on port " + waw.config.port);

	/*
	 *	Helpers
	 */
	waw.router = function (api) {
		const router = express.Router();
		app.use(api, router);
		return router;
	};

	/*
	 *	Use pipeline (same behavior)
	 */
	const use = [
		function (req, res, next) {
			req.url = req.originalUrl.toLowerCase().split("?")[0];
			next();
		},
	];

	waw.use = function (func) {
		use.push(func);
	};

	/*
	 *	Move to helper (serial)
	 */
	const _serial = function (i, arr, callback, custom_call) {
		if (i >= arr.length) return callback();
		if (typeof custom_call == "function") {
			custom_call(arr[i], function () {
				_serial(++i, arr, callback, custom_call);
			});
		} else {
			arr[i](function () {
				_serial(++i, arr, callback, custom_call);
			});
		}
	};

	const serial = (arr, callback, custom_call) =>
		_serial(0, arr, callback, custom_call);

	app.use(function (req, res, next) {
		serial(use, next, function (func, nx) {
			if (typeof func == "function") func(req, res, nx);
			else nx();
		});
	});

	/*
	 *	Express Middleware Support
	 */
	waw.middleware = function (which) {
		return function (req, res, next) {
			if (typeof which === "function") {
				which(req, res, next);
			} else if (typeof waw[which] == "function") {
				waw[which](req, res, next);
			} else next();
		};
	};

	/*
	 *	Auth/roles helpers (same as original)
	 *	Note: waw.ensure depends on waw.resp (set by crud.js usually).
	 */
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

			res.json(false);
		};
	};

	waw.next = (req, res, next) => next();
	waw.block = (req, res) => res.send(false);

	waw.nextUser = (req, res, next) => {
		if (!req.user) {
			req.user = {
				_id: req.sessionID,
			};
		}
		next();
	};

	waw.ensureCrud = (config) => {
		if (
			config === "author" ||
			config === "moderator" ||
			config === "authenticated"
		) {
			return waw.ensure;
		} else if (config !== "all" && config) {
			return waw.role(config);
		} else {
			return waw.next;
		}
	};

	waw.queryCrud = (config, applyId = true) => {
		if (config === "author") {
			return (req) => {
				return applyId
					? { author: req.user._id, _id: req.body._id }
					: { author: req.user._id };
			};
		} else if (config === "moderator") {
			return (req) => {
				return applyId
					? { moderators: req.user._id, _id: req.body._id }
					: { moderators: req.user._id };
			};
		} else {
			return (req) => {
				return applyId ? { _id: req.body._id } : {};
			};
		}
	};

	waw.createCrud = (Create, Read, Update, Delete) => {
		if (Create === undefined) Create = "moderator";
		if (Read === undefined) Read = Create;
		if (Update === undefined) Update = Create;
		if (Delete === undefined) Delete = Create;

		return {
			get: {
				ensure: waw.ensureCrud(Read),
				query: waw.queryCrud(Read, false),
			},
			fetch: {
				ensure: waw.ensureCrud(Read),
				query: waw.queryCrud(Read),
			},
			create: {
				ensure: waw.ensureCrud(Create),
				query: waw.queryCrud(Create),
			},
			update: {
				ensure: waw.ensureCrud(Update),
				query: waw.queryCrud(Update),
			},
			unique: {
				ensure: waw.ensureCrud(Update),
				query: waw.queryCrud(Update),
			},
			delete: {
				ensure: waw.ensureCrud(Delete),
				query: waw.queryCrud(Delete),
			},
		};
	};

	/*
	 *	afterWhile helper
	 */
	waw.afterWhile = (timeout, cb, time) => {
		if (typeof timeout == "function") {
			if (typeof cb == "number") {
				time = cb;
			}
			cb = timeout;
			timeout = this;
		}
		if (typeof time != "number") {
			time = 1000;
		}
		clearTimeout(timeout._timeout);
		timeout._timeout = setTimeout(cb, time);
	};
};
