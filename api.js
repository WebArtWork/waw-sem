const path = require("path");
const fs = require("fs");
module.exports = async function (waw) {
	const app = {};
	const page = {},
		pageChecks = [];
	const method = {},
		methodChecks = [];
	const subdomains = [];

	const customCheck = (url, router = "") => {
		const _url = [],
			local_url = ((router || '') + url).split("/");

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
					req.params = {};

					for (let i = 0; i < check._url.length; i++) {
						if (!check._url[i]) {
							if (((check.router || '') + check.url).split("/")[i] || _url[i]) {
								req.params[
									((check.router || '') + check.url).split("/")[i].replace(":", "")
								] = _url[i];
							}
						}
					}

					if (handler[req.method.toLowerCase() + domain + check.router + check.url]) {
						handler[req.method.toLowerCase() + domain + check.router + check.url](
							req,
							res,
							next
						);
					} else if (handler[req.method.toLowerCase() + check.router + check.url]) {
						handler[req.method.toLowerCase() + check.router + check.url](req, res, next);
					} else if (handler[domain + check.router + check.url]) {
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
		) {
			return;
		}

		waw.serve(options.template.path, {
			prefix: options.template.prefix,
		});

		if (typeof options.template.pages === "string") {
			options.template.pages = options.template.pages.split(" ");
		}

		for (let pageName of options.template.pages) {
			waw.build(options.template.path, pageName);

			if (pageName === "index") {
				pageName = "/";
			}

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
		const router = (options.domain || "") + (options.router || "");

		for (const methodName of ["get", "post", "put", "patch", "delete"]) {
			if (
				typeof options[methodName] === "object" &&
				!Array.isArray(options[methodName])
			) {
				for (const url in options[methodName]) {
					if (url.includes("/:")) {
						methodChecks.push(customCheck(url, options.router));
					}

					if (typeof options[methodName][url] === "function") {
						method[methodName + router + url] = options[methodName][url];
					}
				}
			}
		}
	};
	waw.api = (options) => {
		options.domain = options.domain || "";
		if (options.subdomain && !subdomains.includes(options.domain)) {
			subdomains.push(options.domain);
		}

		appManagement(options);

		templateManagement(options);

		pageManagement(options);

		httpManagement(options);
	};

	await waw.wait(500);

	const getHost = (host) => {
		for (const domain of subdomains) {
			if (domain.endsWith(host)) {
				return domain;
			}
		}
		return host;
	}

	waw.use((req, res, next) => {
		const host = getHost(req.get("host"));

		if (
			methodChecks.length &&
			doCheck(
				req.originalUrl.split("/"),
				methodChecks,
				method,
				req,
				res,
				next,
				host
			)
		) {
			return;
		}

		if (
			typeof method[
				req.method.toLowerCase() + host + req.originalUrl
			] === "function"
		) {
			return method[
				req.method.toLowerCase() + host + req.originalUrl
			](req, res, next);
		} else if (
			typeof method[req.method.toLowerCase() + req.originalUrl] ===
			"function"
		) {
			return method[req.method.toLowerCase() + req.originalUrl](
				req,
				res,
				next
			);
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
				host
			)
		) {
			return;
		}

		if (typeof page[host + req.originalUrl] === "function") {
			return page[host + req.originalUrl](req, res, next);
		} else if (typeof page[req.originalUrl] === "function") {
			return page[req.originalUrl](req, res, next);
		}

		if (typeof page[host + "*"] === "function") {
			return page[host + "*"](req, res, next);
		} else if (typeof page["*"] === "function") {
			return page["*"](req, res, next);
		}
		if (app[host]) {
			if (
				req.originalUrl !== '/' && fs.existsSync(path.join(app[host], req.originalUrl))
			) {
				res.sendFile(path.join(app[host], req.originalUrl));
			} else {
				res.sendFile(path.join(app[host], "index.html"));
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
