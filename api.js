const path = require('path');
const fs = require('fs');
module.exports = function (waw) {
	const app = {};
	const page = {};
	const method = {};
	const appManagement = (options) => {
		if (!options.domain || !options.app) return;

		waw.serve(options.app, {
			domain: options.domain
		});

		app[options.domain] = options.app;
	}
	const templateManagement = (options) => {
		if (
			!options.template ||
			typeof options.template !== 'object' ||
			!options.template.path ||
			!options.template.prefix ||
			!options.template.pages
		) return;

		waw.serve(options.template.path, {
			prefix: options.template.prefix
		});

		if (typeof options.template.pages === 'string') {
			options.template.pages = options.template.pages.split(' ');
		}

		for (let pageName of options.template.pages) {
			if (pageName === 'index') {
				pageName = '/';
			}

			waw.build(options.template.path, pageName);

			if (!page[options.domain + pageName]) {
				page[options.domain + pageName] = (req, res) => {
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
	}
	const pageManagement = (options) => {
		if (!options.page) return;

		if (typeof options.page === 'function') {
			options.page = [{
				callback: options.page
			}];
		}

		if (
			typeof options.page === 'object' &&
			!Array.isArray(options.page)
		) {
			options.page = [options.page];
		}

		for (const pageConfig of options.page) {
			page[options.domain + (pageConfig.url || '/')] = pageConfig.callback;
		}
	}
	const httpManagement = (options) => {
		for (const method of [
			'get',
			'post',
			'put',
			'patch',
			'delete'
		]) {
			if (!options[method]) continue;

			if (typeof options[method] === 'function') {
				options[method] = [{
					callback: options[method]
				}];
			}

			if (typeof options[method] === 'object' && !Array.isArray(options[method])) {
				options[method] = [options[method]];
			}

			for (const page of options[method]) {
				method[options.domain + (options.router || '') + (options.url || '')] = options.callback;
			}
		}
	}
	waw.api = (options) => {
		options.domain = options.domain || '';

		appManagement(options);

		templateManagement(options);

		pageManagement(options);

		httpManagement(options);
	}

	waw.use((req, res, next) => {
		if (req.originalUrl.startsWith('/api/')) {
			next();
		} else if (
			typeof page[req.get('host') + req.originalUrl] === 'function' ||
			typeof page[req.originalUrl] === 'function'
		) {
			page[req.get('host') + req.originalUrl](req, res, next);
		} else if (
			typeof method[req.get('host') + req.originalUrl] === 'function' ||
			typeof method[req.originalUrl] === 'function'
		) {
			method[req.get('host') + req.originalUrl](req, res, next);
		} else if (
			typeof page[req.get('host') + '*'] === 'function' ||
			typeof page['*'] === 'function'
		) {
			page[req.get('host') + '*'](req, res, next);
		} else if (app[req.get('host')]) {
			if (fs.existsSync(path.join(app[req.get('host')], req.originalUrl))) {
				res.sendFile(path.join(app[req.get('host')], req.originalUrl));
			} else {
				res.sendFile(path.join(app[req.get('host')], 'index.html'));
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
	// 	page: ()=>{},
	// 	serve: {
	// 		path: 'path',
	// 		prefix: '/inwawworld'
	// 	},
	// 	post: {
	// 		url: '',
	// 		callback: () => {}
	// 	},
	// 	get: ()=>{},
	// 	put: ()=>{},
	// 	patch: ()=>{},
	// 	delete: ()=>{}
	// });
}
