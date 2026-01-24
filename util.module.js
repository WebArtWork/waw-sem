const defaults = {
	module: {
		default: __dirname + "/module/default",
	},
};

/*
 *	Modules Management (waw add / waw a)
 *	(sem-specific: uses sem/module folder customization)
 */
const new_module = function (waw) {
	waw.server = typeof waw.server === "string" ? waw.server : "server";

	if (!waw.path) {
		if (
			waw.ensure(
				process.cwd() + (waw.server ? "/" : ""),
				waw.server,
				"Module already exists",
				false
			)
		) {
			return;
		}
	}

	if (!waw.template) {
		return waw.read_customization(defaults, "module", () => new_module(waw));
	}

	require(waw.template + "/cli.js")(waw);
};

module.exports = new_module;
