module.exports = async function (waw) {
	waw.ensureDir(waw.base);

	const createLocal = () => {
		waw.readWrite(waw.template + "/index.js", waw.base + `/api.js`, {
			CNAME: waw.Name,
			NAME: waw.name,
		});

		waw.readWrite(waw.template + "/module.json", waw.base + `/module.json`, {
			CNAME: waw.Name,
			NAME: waw.name,
		});

		waw.readWrite(waw.template + "/schema.json", waw.base + `/${waw.name}.collection.json`, {
			CNAME: waw.Name,
			NAME: waw.name,
		});
	}

	if (waw.name.startsWith('waw-')) {
		try {
			waw.git.forceSync(waw.base, { repo: `https://github.com/WebArtWork/${waw.name}.git`, branch: 'master', silent: true });
		} catch (e) {
			createLocal();
		}
	} else {
		createLocal();
	}
};
