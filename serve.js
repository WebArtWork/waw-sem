const fs = require('fs');
module.exports = function(waw){
	// serve
	var dists = [];
	waw.serve = function(dir, opts={}){
		if(opts.host) opts.host = opts.host.toLowerCase();
		dists.push({ dir, opts });
	}
	// url
	var urls = [];
	waw.url = function(file, links, obj, host){
		console.log(links);
		console.log(host);
		if(typeof links == 'string'){
			links = links.split(' ');
		}
		for (var i = 0; i < links.length; i++) {
			links[i] = links[i].split('/').join('');
		}
		if(host) host = host.toLowerCase();
		urls.push({ file, links, obj, host});
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
		if(req.url.indexOf('.')>-1){
			for (var i = 0; i < dists.length; i++) {
				if(dists[i].opts.host && dists[i].opts.host != req.get('host').toLowerCase()) continue;
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
		let url = req.url.split('/').join('') + (urls[i].host||'');
		if(waw.html(url)) return res.send(waw.html(url));
		for (var i = 0; i < urls.length; i++) {
			if(urls[i].host && urls[i].host != req.get('host').toLowerCase()) continue;
			for (var j = 0; j < urls[i].links.length; j++) {
				if(urls[i].links[j] == url){
					if(urls[i].obj){
						return res.send(waw.html(url, waw.derer.renderFile(urls[i].file, urls[i].obj)));
					}else{
						return res.sendFile(urls[i].file);
					}
				}
			}
		}
		next();
	});
}