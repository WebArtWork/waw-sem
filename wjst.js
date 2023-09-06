const fs = require('fs');
const wjst = require('wjst');
const path = require('path');
module.exports = async function (waw) {
	const serveFile = file => {
		const name = path.basename(file).replace('.wjst.js', '');
		waw.app.get('/api/wjst/' + name, (req, res) => {
			res.sendFile(file);
		});
	}

	const checkModuleForWjst = module => {
		const files = waw.getFiles(module.__root)
		for (const file of files) {
			if(file.endsWith('.wjst.js')) {
				serveFile(file);
			}
		}
	}
	for (const module of waw.modules) {
		checkModuleForWjst(module);
	}

	/*
	*	Server Rendering
	*/
	waw.wjst = wjst;
	waw.derer = wjst;
	var wjstOpts = {
		varControls: ['{{{', '}}}']
	}
	if (!waw.config.production) {
		wjstOpts.cache = false;
	}
	wjst.setDefaults(wjstOpts);
	waw.app.engine('html', wjst.renderFile);
	waw.app.set('view engine', 'html');
	waw.app.set('view cache', true);
	wjst.setFilter('string', function (input) {
		return input && input.toString() || '';
	});
	wjst.setFilter('fixlink', function (link) {
		if (link.indexOf('//') > 0) return link;
		else return 'http://' + link;
	});
	waw.wjst.setFilter('mongodate', function (_id) {
		if (!_id) return new Date();
		let timestamp = _id.toString().substring(0, 8);
		return new Date(parseInt(timestamp, 16) * 1000);
	});
	waw.wjst.setFilter('c', function (file, obj) {
		file = file.toString();
		if (fs.existsSync(process.cwd() + file + '/index.html')) {
			return waw.wjst.compileFile(process.cwd() + file + '/index.html')(obj || {});
		}
		file = path.normalize(file);
		file = file.split(path.sep);
		file.shift();
		file.shift();
		file.unshift('');
		file = file.join(path.sep);
		if (fs.existsSync(process.cwd() + file + path.sep + 'index.html')) {
			return waw.wjst.compileFile(process.cwd() + file + '/index.html')(obj || {});
		}
		return 'No component found for: ' + file;
	});

	waw.wjst.setFilter('resized', (src, size) => {
		try {
			let thumb = src.replace('/image/', '/resized/').split('.jpg')[0] + '/' + size + '.jpg';
			if (fs.existsSync(base + thumb.split('/')[2] + '/files/' + thumb.split('/')[4] + '/' + size + '.jpg')) {
				return thumb;
			} else {
				console.log('Missing thumb: ', thumb);
			}
			if (fs.existsSync(base + src.split('/')[2] + '/files/' + src.split('/')[4].split('.jpg')[0] + '.jpg')) {
				return src;
			} else {
				console.log('Missing src: ', src);
			}
		} catch (err) { }
		return waw.config.default || __dirname + '/default.png';
	});

	// derer.setFilter('tr', waw._tr);
	// derer.setFilter('translate', waw._tr);
	waw._derer = wjst;
};
