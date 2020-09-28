const fs = require('fs');
const path = require('path');
const formidable = require('formidable');
const mongoose = require('mongoose');
module.exports = function(waw) {
	/*
	*	File Servce
	*/
		const serve_file = function(opts) {
			return function(req, res){
				if (fs.existsSync(opts.dirname + req.params.file)) {
					res.sendFile(opts.dirname + req.params.file);
				}else{
					if(typeof opts.default == 'string' && fs.existsSync(opts.dirname + opts.default)){
						res.sendFile(opts.dirname + opts.default);
					}else if(opts.default){
						console.log('To change default picture you need to write specific name and put such file on the part.');
						res.sendFile(__dirname+'/default.png');
					}else{
						res.sendFile(__dirname+'/default.png');
					}
				}
			}
		};
		const serve = function(part, opts){
			fs.mkdirSync(opts.dirname, { recursive: true });
			if (!fs.existsSync(opts.dirname+'.gitignore')) {
				fs.writeFileSync(opts.dirname+'.gitignore', `# Ignore everything in this directory\n*\n# Except this file\n!.gitignore`+(opts.default&&"\n"+opts.default||""), 'utf8');
			}
			waw.app.get("/api/"+part+"/file/:file", serve_file(opts));
			waw.app.get("/api/"+part+"/file/:file/:name", serve_file(opts));
			waw.app.get("/api/"+part+"/video/:file", serve_file(opts));
			waw.app.get("/api/"+part+"/video/:file/:name", serve_file(opts));
			waw.app.get("/api/"+part+"/image/:file", serve_file(opts));
			waw.app.get("/api/"+part+"/image/:file/:name", serve_file(opts));
				waw.app.get("/api/"+part+"/avatar/:file", serve_file(opts));
				waw.app.get("/api/"+part+"/avatar/:file/:name", serve_file(opts));
		}
	/*
	*	File Management
	*/
		const upload_image = function(req, res, part, opts){
			if(!req.filename && typeof opts.rename == 'function'){
				let filename = opts.rename(req, (filename)=>{
					req.filename = filename;
					upload_image(req, res, part, opts);
				});
				if(typeof filename != 'string') return;
				else req.filename = filename;
			}
			if(!req.filename) req.filename = mongoose.Types.ObjectId() + '.jpg';
			waw.dataUrlToLocation(req.body.dataUrl, opts.dirname, req.filename, ()=>{
				req.files = [{
					url: '/api/'+part+'/image/' + req.filename + '?' + Date.now(),
					name: req.filename
				}];
				if(typeof opts.process == 'function'){
					opts.process(req, res, ()=>{
						res.json(req.files);
					});
				}else{
					res.json(req.files);
				}				
			});
		}
		const process_file = function(req, file, part, opts){
			let name;
			return function(next){
				if(typeof opts.rename == 'function'){
					req.file = file;
					name = opts.rename(req, (name)=>{
						if(name) return;
						fs.renameSync(file.path, name);
						req.files.push({
							url: '/api/'+part+'/file/'+path.basename(name)+'/'+file.name.split(' ').join(''),
							name: file.name
						});
						next();
					});
					if(!name) return;
				}else{
					name = file.path+'_'+file.name;
					name = name.split('/').join('');
				}
				fs.renameSync(file.path, name);
				req.files.push({
					url: '/api/'+part+'/file/'+path.basename(name)+'/'+file.name.split(' ').join(''),
					name: file.name
				});
				next();
			}
		}
		const upload_file = function(req, res, part, opts){
			const form = new formidable.IncomingForm({
				uploadDir: opts.dirname,
				multiples: true
			});
			form.parse(req, function(err, fields, files) {
				if (err) return res.json(waw.resp(null, 400, 'Unsuccessful update'));
				for(let each in fields){
					req.body[each] = fields[each];
				}
				req.files = [];
				let processes = [];
				for(let each in files){
					processes.push(process_file(req, files[each], part, opts));
				}
				waw.parallel(processes, ()=>{
					if(typeof opts.process == 'function'){
						opts.process(req, res, ()=>{
							res.json(req.files);
						});
					}else{
						res.json(req.files);
					}
				});
			});			
		}
		const manage = function(part, opts){
			waw.app.post("/api/"+part+"/file"+(opts.name&&'/'+opts.name||''), waw.middleware(opts.ensure || waw.role('admin')), function(req, res) {
				if(req.body.dataUrl) upload_image(req, res, part, opts);
				else upload_file(req, res, part, opts);
			});
			waw.app.post("/api/"+part+"/file/delete"+(opts.name&&'/'+opts.name||''), waw.middleware(opts.ensure || waw.role('admin')), function(req, res) {
				let filename = req.body.url.split('/').pop();
				if (fs.existsSync(opts.dirname + filename)){
					fs.unlinkSync(opts.dirname + filename);
				}
				if(typeof opts.remove == 'function'){
					opts.remove(req, res, ()=>{
						res.json(waw.resp(true, 200, 'Successful'));
					});
				}else{
					res.json(waw.resp(true, 200, 'Successful'));
				}
			});
		}
		waw.dataUrlToLocation = function(dataUrl, loc, file, cb){
			var base64Data = dataUrl.replace(/^data:image\/png;base64,/, '').replace(/^data:image\/jpeg;base64,/, '');
			var decodeData = Buffer.from(base64Data, 'base64');
			fs.mkdirSync(loc, { recursive: true });
			fs.writeFile(loc+'/'+file, decodeData, cb);
		}
	/*
	*	Config Files
	*/
		let options = {};
		for (var i = 0; i < waw.parts.length; i++) {
			if(typeof waw.parts[i].file == 'string'){
				waw.parts[i].file = {dirname:waw.parts[i].file};
			}
			if(typeof waw.parts[i].file == 'object'){
				options[waw.parts[i].name.toLowerCase()] = {
					dirname: waw.parts[i].__root + '/' + (waw.parts[i].file.dirname||'files') + '/',
					part: waw.parts[i]
				};
			}else{
				options[waw.parts[i].name.toLowerCase()] = {
					dirname: waw.parts[i].__root + '/files/',
					part: waw.parts[i]
				};
			}
		}
		let set = {};
		waw.file = function(part, config){
			part = part.toLowerCase();
			if(!options[part]){
				return console.log("Something went wrong, part was not executed correctly.");				
			}
			if(set[part]){
				return console.log("You can't set same part multiple times. Please use once array of config's.");
			}
			set[part] = true;
			serve(part, options[part]);
			if(Array.isArray(config)){
				for (var i = 0; i < config.length; i++) {
					if(typeof config[i] != 'object') continue;
					for(let each in options[part]){
						config[i][each] = options[part][each];
					}
					manage(part, config[i]);
				}
			}else if(typeof config == 'object'){
				for(let each in options[part]){
					config[each] = options[part][each];
				}
				manage(part, config);
			}
			
		};
		waw.files = function(){
			console.log('MOVE waw.files to waw.file so your files work again.');
		};
	/*
	*	End of
	*/
};