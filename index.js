module.exports = async function (waw) {
	require("./util.express")(waw);

	await require("./util.mongo")(waw);

	require("./util.socket")(waw);

	require("./util.crud")(waw);

	for (const m of waw.modules) {
		for (const f of m.files) {
			if (f.endsWith('collection.js')) {
				await require(f)(waw);
			}
		}
	}

	for (const m of waw.modules) {
		for (const f of m.files) {
			if (f.endsWith('api.js')) {
				await require(f)(waw);
			}
		}
	}

	/*
	*	Start server
	*/
	if (!waw.config.port) waw.config.port = 8080;

	waw.server.listen(waw.config.port);

	console.log("App listening on port " + waw.config.port);
};
