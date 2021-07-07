const fs = require('fs');
module.exports = function(waw){
	// serve
	var dists = [];
	waw.serve = function(dir, opts={}){
		if(opts.host) opts.host = opts.host.toLowerCase();
		dists.push({ dir, opts });
	}
	// url
	let content = {};
	let files = {};
	waw.url = function(file, links, obj, host){
		if(host) host = host.toLowerCase();
		if(typeof links == 'string'){
			links = links.split(' ');
		}
		let html = waw.derer.renderFile(file, obj);
		for (var i = 0; i < links.length; i++) {
			links[i] = links[i].split('/').join('');
			if(obj){
				content[(host||'')+links[i]] = html;
				console.log('SERVE RENDER: ', (host||'')+' | '+links[i]);
			}else{
				files[(host||'')+links[i]] = file;
				console.log('SERVE FILE: ', (host||'')+' | '+links[i], file);
			}
		}
	}
	// render
	var htmls = {};
	waw.html = function(url, code){
		if(code) htmls[url] = code;
		return htmls[url];
	}
	waw.render = function(file, obj){
		return waw.derer.renderFile(file, obj);
	}
	// checkup
	waw.use(function(req, res, next) {
		if(req.url.indexOf('/api/')==0) return next();
		const host = (req.get('host')||'').toLowerCase();
		if(req.url.indexOf('.')>-1){
			for (var i = 0; i < dists.length; i++) {
				if(dists[i].opts.host && dists[i].opts.host != host) continue;
				let url = req.url;
				if(dists[i].opts.prefix){
					if(req.url.indexOf(dists[i].opts.prefix)!=0) continue;
					url = url.replace(dists[i].opts.prefix, '');
				}
				if (fs.existsSync(dists[i].dir + url)) {
					return res.sendFile(dists[i].dir + url);
				}
			}
		}
		let url = req.url.split('/').join('');
		if(content[host+url]) return res.send(content[host+url]);
		if(content[url]) return res.send(content[url]);
		if(files[host+url]) return res.sendFile(files[host+url]);
		if(files[url]) return res.sendFile(files[url]);
		next();
	});
}