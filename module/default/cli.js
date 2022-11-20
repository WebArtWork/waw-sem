const fs = require('fs');

module.exports = function (waw) {
	fs.mkdirSync(waw.base, { recursive: true });

	let file = fs.readFileSync(waw.template + '/index.js', 'utf8');
	file = file.split('CNAME').join(waw.Name);
	file = file.split('NAME').join(waw.name);
	fs.writeFileSync(waw.base + '/index.js', file, 'utf8');

	file = fs.readFileSync(waw.template + '/schema.js', 'utf8');
	file = file.split('CNAME').join(waw.Name);
	file = file.split('NAME').join(waw.name);
	fs.writeFileSync(waw.base + '/schema.js', file, 'utf8');

	file = fs.readFileSync(waw.template + '/module.json', 'utf8');
	file = file.split('CNAME').join(waw.Name);
	file = file.split('NAME').join(waw.name);
	fs.writeFileSync(waw.base + '/module.json', file, 'utf8');

	console.log('Module has been created');

	process.exit(1);
}
