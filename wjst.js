const fs = require('fs');
const wjst = require('wjst');
const path = require('path');
const { log } = require('console');
module.exports = async function (waw) {
	// TODO remove on version 23.3.X
	if (typeof waw.module_each_file !== 'function') {
		waw.module_each_file = async (callback, ext) => {
			await waw.wait(500);
			for (const module of waw.modules) {
				const files = waw.getFiles(module.__root);
				for (const file of files) {
					if (
						!ext ||
						file.endsWith(ext)
					) {
						callback(file);
					}
				}
			}
		}
	}

	waw.module_each_file((file) => {
		const name = path.basename(file).replace('.wjst.js', '');
		waw.app.get('/api/wjst/' + name, (req, res) => {
			res.sendFile(file);
		});
	}, '.wjst.js');

	const services = {};
	waw.Service = name => services[name];
	waw.module_each_file((file) => {
		const name = path.basename(file).replace('.service.js', '');
		try {
			const service = require(file);
			if (service.constructor) {
				services[name] = service;
			}
		} catch (error) {
			console.log(file, error);
		}
	}, '.service.js');

	const collections = {};
	waw.Collection = name => collections[name];
	waw.module_each_file((file) => {
		const name = path.basename(file).replace('.collection.js', '');
		try {
			const collection = require(file)(waw);
			if (typeof collection.find === 'function') {
				collections[name] = collection;
			}
		} catch (error) {
			console.log(file, error);
		}
	}, '.collection.js');

	waw.module_each_file((file) => {
		try {
			require(file)(waw);
		} catch (error) {
			console.log(file, error);
		}
	}, '.api.js');

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
