const fs = require("fs");

module.exports = async (waw) => {
	waw.host = (host, callback) => {
		return (req, res, next) => {
			if (
				(!host || req.get('host').toLowerCase() === host.toLowerCase()) &&
				typeof callback === 'function'
			) {
				callback(req, res, next);
			} else {
				next();
			}
		}
	}

	const dists = [];

	waw.serve = (dir, opts = {}) => {
		if (opts.host) {
			opts.host = opts.host.toLowerCase();
		}

		dists.push({ dir, opts });
	};

	const content = {};

	const files = {};

	const get = (url, file) => {
		waw.app.get(url, (req, res) => {
			res.sendFile(file);
		});
	}

	waw.url = (file, links, obj, host) => {
		if (host) host = host.toLowerCase();

		if (typeof links === "string") {
			links = links.split(" ");
		}

		for (let i = links.length - 1; i >= 0; i--) {
			if (links[i].indexOf('/:') > -1) {
				get(links[i], file);

				links.splice(i, 1);
			}
		}

		let html = waw.wjst.renderFile(file, obj);

		for (let i = 0; i < links.length; i++) {
			links[i] = links[i].split("/").join("");

			if (obj) {
				content[(host || "") + links[i]] = html;
			} else {
				files[(host || "") + links[i]] = file;
			}
		}
	};

	const htmls = {};

	waw.html = (url, code) => {
		if (code) htmls[url] = code;
		return htmls[url];
	};

	waw.render = function(file, obj, eject){
		if (typeof eject === 'function') {
			eject(obj);
		}

		return waw.wjst.renderFile(file, obj);
	}

	waw.use((req, res, next) => {
		if (req.originalUrl.startsWith('/api/')) {
			return next();
		}

		const host = (req.get("host") || "").toLowerCase();

		if (req.url.indexOf(".") > -1) {
			for (let i = 0; i < dists.length; i++) {
				if (
					dists[i].opts.host &&
					dists[i].opts.host !== host
				) {
					continue;
				}

				let url = req.url;

				if (dists[i].opts.prefix) {
					if (req.url.indexOf(dists[i].opts.prefix) != 0) {
						continue;
					}

					url = url.replace(dists[i].opts.prefix, "");
				}

				if (fs.existsSync(dists[i].dir + url)) {
					return res.sendFile(dists[i].dir + url);
				}
			}
		}

		let url = req.url.split("/").join("");

		if (content[host + url] || content[url]) {
			return res.send(content[host + url] || content[url]);
		}

		if (files[host + url] || files[url]) {
			return res.sendFile(files[host + url] || files[url]);
		}

		next();
	});
};
