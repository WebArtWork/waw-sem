const fs = require("fs");
const path = require("path");

const _fetch_module = (waw, location, callback) => {
	if (!fs.existsSync(location + "/module.json")) {
		return callback(false);
	}
	let json = waw.readJson(location + "/module.json");
	if (!json.repo) {
		return callback(false);
	}
	waw.fetch(path.normalize(location), json.repo, (err) => {
		if (err) {
			// keep old silent behavior
		}
		callback(!err);
	});
};

/*
 *	Fetch modules from repo (waw fetch / waw f)
 *	(kept behavior 1:1)
 */
const fetch_module = function (waw) {
	waw.server = typeof waw.server === "string" ? waw.server : "server";
	const base = process.cwd() + (waw.server ? "/" : "") + waw.server + "/";

	if (waw.argv.length > 1) {
		_fetch_module(waw, base + waw.argv[1].toLowerCase(), (done) => {
			if (done) console.log(waw.argv[1] + " were fetched from the repo");
			else console.log(waw.argv[1] + " don't have repo");
		});
	} else {
		let counter = waw.modules.length;

		for (let i = 0; i < waw.modules.length; i++) {
			if (waw.modules[i].repo && waw.modules[i].__root) {
				_fetch_module(waw, waw.modules[i].__root, () => {
					if (--counter === 0) {
						console.log(
							"All possible modules were fetched from their repositories"
						);
						process.exit(1);
					}
				});
			} else {
				if (--counter === 0) {
					console.log(
						"All possible modules were fetched from their repositories"
					);
					process.exit(1);
				}
			}
		}
	}
};

module.exports = fetch_module;
