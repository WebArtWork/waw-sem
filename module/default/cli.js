const fetch = require("node-fetch");
const path = require('path');
const fs = require('fs');

module.exports = async function (waw) {
	fs.mkdirSync(waw.base, { recursive: true });

	const response = await fetch(
		"https://webart.work/api/registry/waw/module/" + waw.name
	);
		let resp;
	if (response.ok) {
		resp = await response.json();
	}
	
	if (response.ok && resp) {
		fs.mkdirSync(waw.base, {
			recursive: true
		});

		if (resp.repo) {
			waw.fetch(waw.base, resp.repo, (err) => {}, resp.branch || 'master');
		} else {
			for (const file in resp.files) {
				fs.writeFileSync(
					path.join(waw.base, file),
					resp.files[file],
					'utf8'
				);
			}
		}
	} else {
		let file = fs.readFileSync(waw.template + '/index.js', 'utf8');
		file = file.split('CNAME').join(waw.Name);
		file = file.split('NAME').join(waw.name);
		fs.writeFileSync(waw.base + `/${waw.name}.api.js`, file, 'utf8');

		file = fs.readFileSync(waw.template + '/schema.js', 'utf8');
		file = file.split('CNAME').join(waw.Name);
		file = file.split('NAME').join(waw.name);
		fs.writeFileSync(waw.base + `/${waw.name}.collection.js`, file, 'utf8');

		file = fs.readFileSync(waw.template + '/module.json', 'utf8');
		file = file.split('CNAME').join(waw.Name);
		file = file.split('NAME').join(waw.name);
		fs.writeFileSync(waw.base + '/module.json', file, 'utf8');
	}

	console.log('Module has been created');

	process.exit(1);
}
