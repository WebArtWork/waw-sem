const path = require("path");
const fs = require("fs");
module.exports = function (waw) {
	const app = {};
	const page = {},
		pageChecks = [];
	const method = {},
		methodChecks = [];

	const customCheck = (url, router = "") => {
		const _url = [],
			local_url = url.split("/");

		for (let i = 0; i < local_url.length; i++) {
			_url.push(local_url[i].startsWith(":") ? false : local_url[i]);
		}

		return { url, _url, router };
	};
	const doCheck = (_url, checks, handler, req, res, next, domain) => {
		for (const check of checks) {
			if (_url.length === check._url.length) {
				let correct = true;

				for (let i = 0; i < check._url.length; i++) {
					if (check._url[i] && check._url[i] !== _url[i]) {
						correct = false;
						break;
					}
				}

				if (correct) {
					req.urlParams = {};

					for (let i = 0; i < check._url.length; i++) {
						if (!check._url[i]) {
							if (check.url.split("/")[i] || _url[i]) {
								req.urlParams[
									check.url.split("/")[i].replace(":", "")
								] = _url[i];
							}
						}
					}

					if (handler[domain + check.router + check.url]) {
						handler[domain + check.router + check.url](
							req,
							res,
							next
						);
					} else if (handler[check.router + check.url]) {
						handler[check.router + check.url](req, res, next);
					}

					return true;
				}
			}
		}

		return false;
	};
	const appManagement = (options) => {
		if (!options.domain || !options.app) return;

		waw.serve(options.app, {
			domain: options.domain,
		});

		app[options.domain] = options.app;
	};
	const templateManagement = (options) => {
		if (
			!options.template ||
			typeof options.template !== "object" ||
			!options.template.path ||
			!options.template.prefix ||
			!options.template.pages
		)
			return;

		waw.serve(options.template.path, {
			prefix: options.template.prefix,
		});

		if (typeof options.template.pages === "string") {
			options.template.pages = options.template.pages.split(" ");
		}

		for (let pageName of options.template.pages) {
			if (pageName === "index") {
				pageName = "/";
			}

			waw.build(options.template.path, pageName);

			if (!page[options.domain + "/" + pageName]) {
				page[options.domain + "/" + pageName] = (req, res) => {
					res.send(
						waw.render(
							path.join(
								options.template.path,
								"dist",
								pageName + ".html"
							),
							waw.readJson(
								path.join(
									options.template.path,
									"pages",
									pageName,
									"page.json"
								)
							)
						)
					);
				};
			}
		}
	};
	const pageManagement = (options) => {
		if (typeof options.page === "object" && !Array.isArray(options.page)) {
			for (const url in options.page) {
				if (url.includes("/:")) {
					pageChecks.push(customCheck(url));
				}

				if (typeof options.page[url] === "function") {
					page[options.domain + url] = options.page[url];
				}
			}
		}
	};
	const httpManagement = (options) => {
		const router = options.domain + (options.router || "");

		for (const methodName of ["get", "post", "put", "patch", "delete"]) {
			if (
				typeof options[methodName] === "object" &&
				!Array.isArray(options[methodName])
			) {
				for (const url in options[methodName]) {
					if (url.includes("/:")) {
						methodChecks.push(customCheck(url, router));
					}

					if (typeof options[methodName][url] === "function") {
						method[router + url] = options[methodName][url];
					}
				}
			}
		}
	};
	waw.api = (options) => {
		options.domain = options.domain || "";

		appManagement(options);

		templateManagement(options);

		pageManagement(options);

		httpManagement(options);
	};

	waw.use((req, res, next) => {

		if (
			methodChecks.length &&
			doCheck(
				req.originalUrl.split("/"),
				methodChecks,
				method,
				req,
				res,
				next,
				req.get("host")
			)
		) {
			return;
		}

		if (typeof method[req.get("host") + req.originalUrl] === "function") {
			return method[req.get("host") + req.originalUrl](req, res, next);
		} else if (typeof method[req.originalUrl] === "function") {
			return method[req.originalUrl](req, res, next);
		}

		if (req.originalUrl.startsWith("/api/")) {
			return next();
		}

		if (
			pageChecks.length &&
			doCheck(
				req.originalUrl.split("/"),
				pageChecks,
				page,
				req,
				res,
				next,
				req.get("host")
			)
		) {
			return;
		}

		if (typeof page[req.get("host") + req.originalUrl] === "function") {
			return page[req.get("host") + req.originalUrl](req, res, next);
		} else if (typeof page[req.originalUrl] === "function") {
			return page[req.originalUrl](req, res, next);
		}

		if (typeof page[req.get("host") + "*"] === "function") {
			return page[req.get("host") + "*"](req, res, next);
		} else if (typeof page["*"] === "function") {
			return page["*"](req, res, next);
		}

		if (app[req.get("host")]) {
			if (
				fs.existsSync(path.join(app[req.get("host")], req.originalUrl))
			) {
				res.sendFile(path.join(app[req.get("host")], req.originalUrl));
			} else {
				res.sendFile(path.join(app[req.get("host")], "index.html"));
			}
		} else {
			next();
		}
	});

	/* Sample */
	// waw.api({
	// 	router: '/api/product',
	// 	domain: 'webart.work',
	// 	app: 'path',
	// 	page: {
	// 		'/': () => {}
	// 	},
	// 	post: {
	// 		'/get': () => {}
	// 	},
	// 	get: {},
	// 	put: {},
	// 	patch: {},
	// 	delete: {}
	// });
};
