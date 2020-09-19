const fs = require('fs');
const path = require('path');
const express = require('express');
var session = require('express-session');
const app = express();
const server = require('http').Server(app);
const favicon = require('serve-favicon');
const cookieParser = require('cookie-parser');
const methodOverride = require('method-override');
const bodyParser = require('body-parser');
const formidable = require('formidable');
const mongoose = require('mongoose');
const derer = require('derer');
const io = require('socket.io')(server, { origins: '*:*'});
module.exports = function(waw){
	var sessionMaxAge = 365 * 24 * 60 * 60 * 1000;
	if(typeof waw.config.session == 'number'){
		sessionMaxAge = waw.config.session;
	}	
	var store;
	if(waw.config.mongo){
		let mongoAuth = '';
		if(waw.config.mongo.user&&waw.config.mongo.pass){
			mongoAuth = waw.config.mongo.user + ':' + waw.config.mongo.pass + '@';
		}
		waw.mongoUrl = 'mongodb://'+mongoAuth+(waw.config.mongo.host||'localhost')+':'+(waw.config.mongo.port||'27017')+'/'+(waw.config.mongo.db||'test');
	}
	if(waw.mongoUrl){
		store = new(require("connect-mongo")(session))({
			url: waw.mongoUrl
		});
	}
	app.use(session({
		key: 'express.sid.'+waw.config.prefix,
		secret: 'thisIsCoolSecretFromWaWFramework'+waw.config.prefix,
		resave: false,
		saveUninitialized: true,
		cookie: {
			maxAge: sessionMaxAge,
			domain: waw.config.domain||undefined
		},
		rolling: true,
		store: store
	}));
	waw.store = store;

	if(waw.config.icon && fs.existsSync(process.cwd() + waw.config.icon))
		app.use(favicon(process.cwd() + waw.config.icon));
	app.use(cookieParser());
	app.use(methodOverride('X-HTTP-Method-Override'));
	app.use(bodyParser.urlencoded({
		'extended': 'true',
		'limit': '50mb'
	}));
	app.use(bodyParser.json({
		'limit': '50mb'
	}));
	if(!waw.config.port) waw.config.port=8080;
	server.listen(waw.config.port);
	console.log("App listening on port " + (waw.config.port));
	/*
	*	Helpers
	*/
		waw.router = function(api){
			var router = express.Router();
			app.use(api, router);
			return router;
		}
		waw.app = app;
		waw.express = express;
	/*
	*	Use
	*/
		const use = [function(req, res, next){
			req.url = req.originalUrl.toLowerCase().split('?')[0];
			next();
		}];
		waw.use = function(func){
			use.push(func);
		}
		app.use(function(req, res, next){
			serial(use, next, function(func, nx){
				if(typeof func == 'function') func(req, res, nx);
				else nx();
			});
		});
	/*
	*	Prepare
	*/
		const prepares = {};
		waw.prepare = function(which, req, res, next){
			if(typeof prepares[which] == 'function'){
				prepares[which](req, res, next);
			}else next({});
		}
		waw.set_prepare = function(which, cb){
			if(typeof cb == 'function' && which){
				prepares[which] = cb;
			}				
		}
	/*
	*	Express Middleware Support
	*/
		waw.middleware = function(which){
			return function(req, res, next){
				if(typeof which == 'function'){
					which(req, res, next);
				}else if(typeof waw[which] == 'function'){
					waw[which](req, res, next);
				}else next();
			}
		}
		waw.next = (req, res, next)=>next()
		waw.ensure = (req, res, next)=>{
			if(req.user) next();
			else res.json(waw.resp(false));
		}
		waw.role = function(roles, extra){
			if(typeof roles == 'string'){
				roles = roles.split(' ');
			}
			return function(req, res, next){
				if(req.user && req.user.is){
					for (var i = 0; i < roles.length; i++) {
						if(req.user.is[roles[i]]){
							if(extra) extra(req, res, next);
							else next();
							return;
						}
					}
				}
				res.json(false);
			}
		}
	/*
	*	Support for 0.x version of waw until 2.0
	*/
		waw._initRouter = waw.router;
		waw._app = app;
		waw._ensure = waw.ensure;
		waw._config = waw.config;
		waw._middleware = [];
	/*
	*	Move to helper
	*/
		const _serial = function(i, arr, callback, custom_call){
			if(i>=arr.length) return callback();
			if(typeof custom_call == 'function'){
				custom_call(arr[i], function(){
					_serial(++i, arr, callback, custom_call);
				});
			}else{
				arr[i](function(){
					_serial(++i, arr, callback, custom_call);
				});
			}
		}
		const serial = (arr, callback, custom_call) => _serial(0, arr, callback, custom_call);
		waw.afterWhile = (timeout, cb, time)=>{
			if(typeof timeout == 'function'){
				if(typeof cb == 'number'){
					time = cb;
				}
				cb = timeout;
				timeout = this;
			}
			if(typeof time != 'number'){
				time = 1000;
			}
			clearTimeout(timeout._timeout);
			timeout._timeout = setTimeout(cb, time);
		};
	/*
	*	Server Rendering
	*/
		waw.derer = derer;
		var dererOpts = {
			varControls: ['{{{', '}}}']
		}
		if(!waw.config.production){
			dererOpts.cache = false;
		}
		derer.setDefaults(dererOpts);
		waw.app.engine('html', derer.renderFile);
		waw.app.set('view engine', 'html');
		waw.app.set('view cache', true);
		derer.setFilter('string',function(input){
			return input&&input.toString()||'';
		});		
		derer.setFilter('fixlink',function(link){
			if(link.indexOf('//')>0) return link;
			else return 'http://'+link;
		});
		// derer.setFilter('tr', waw._tr);
		// derer.setFilter('translate', waw._tr);
		waw._derer = derer;
	/*
	*	Sockets
	*/
		waw.socket = {
			io: io,
			emit: function(to, message, room=false){
				if(room){
					io.in(room).emit(to, message);
				}else{
					io.emit(to, message);
				}
			},
			add: function(connection){
				if(typeof connection == 'function') connections.push(connection);
			}
		}
		let connections = [function(socket){
			socket.on('create', function(content){
				socket.broadcast.emit('create', content);
			});
			socket.on('update', function(content){
				socket.broadcast.emit('update', content);
			});
			socket.on('unique', function(content){
				socket.broadcast.emit('unique', content);
			});
			socket.on('delete', function(content){
				socket.broadcast.emit('delete', content);
			});
		}];
		io.on('connection', function (socket) {
			for (var i = 0; i < connections.length; i++) {
				if(typeof connections[i] == 'function'){
					connections[i](socket);
				}
			}
		});
	/* Files Management */
		waw.dataUrlToLocation = function(dataUrl, loc, file, cb){
			var base64Data = dataUrl.replace(/^data:image\/png;base64,/, '').replace(/^data:image\/jpeg;base64,/, '');
			var decodeData = Buffer.from(base64Data, 'base64');
			fs.mkdirSync(loc, { recursive: true });
			fs.writeFile(loc+'/'+file, decodeData, cb);
		}
		waw.files = function(opts){
			if(!opts.dirname){
				return console.log('Please provide dirname option');
			}
			if(opts.dirname.charAt(opts.dirname.length-1)!='/'){
				opts.dirname += '/';
			}
			if(!opts.schema){
				return console.log('Please provide schema option');
			}
			if(!opts.part){
				return console.log('Please provide part option');
			}
			waw.app.post("/api/"+opts.part+"/file", waw.middleware(opts.ensure || waw.role('admin')), function(req, res) {
				const form = new formidable.IncomingForm({
					uploadDir: opts.dirname,
					multiples: true
				});
				form.parse(req, function(err, fields, files) {
					if (err) return res.json(waw.resp(null, 400, 'Unsuccessful update'));
					opts.schema.findOne(typeof opts.query == 'function' && opts.query(req, res) || {
						moderators: req.user&&req.user._id,
						_id: req.body._id
					}, function(err, doc) {
						if(err || !doc) return res.send(false);
						for(let each in files){
							let name = files[each].path+'_'+files[each].name;
							fs.renameSync(files[each].path, name);
							if(typeof opts.files == 'function'){
								opts.files(doc, files[each]);
							}else{
								if(!Array.isArray(doc.files)) doc.files=[];
								doc.files.push('/api/'+opts.part+'/file/' + path.basename(name));
							}
						}
						doc.save(()=>{
							let resp = typeof opts.files_resp == 'function' && opts.files_resp(doc) || doc.files;
							res.json(waw.resp(resp, 200, 'Successful'));
						});
					});
				});
			});
			waw.app.post("/api/"+opts.part+"/avatar", opts.ensure || waw.role('admin'), function(req, res) {
				opts.schema.findOne(typeof opts.query == 'function' && opts.query(req, res) || {
					moderators: req.user&&req.user._id,
					_id: req.body._id
				}, function(err, doc) {
					if(err || !doc) return res.json(waw.resp(null, 400, 'Unsuccessful update'));
					let url = '/api/'+opts.part+'/avatar/' + doc._id + '.jpg?' + Date.now();

					doc.thumb = '/api/'+opts.part+'/avatar/' + doc._id + '.jpg?' + Date.now();
					waw.parallel([function(n) {
						doc.save(n);
					}, function(n) {
						waw.dataUrlToLocation(req.body.dataUrl, opts.dirname, doc._id + '.jpg', n);
					}], function() {
						res.json(waw.resp(doc.thumb, 200, 'Successful'));
					});
				});
			});
			waw.app.post("/api/"+opts.part+"/avatars", opts.ensure || waw.role('admin'), function(req, res) {
				let custom = mongoose.Types.ObjectId();
				let url = '/api/'+opts.part+'/avatar/' + custom + '.jpg';
				waw.parallel([function(done) {
					let update = typeof opts.avatars == 'function' && opts.avatars(url) || { thumbs: url };
					opts.schema.update(typeof opts.query == 'function' && opts.query(req, res) || {
						moderators: req.user&&req.user._id,
						_id: req.body._id
					}, { $push: { thumbs: url } }, done);
				}, function(n) {
					waw.dataUrlToLocation(req.body.dataUrl, opts.dirname, custom + '.jpg', n);
				}], function() {
					res.json(waw.resp(url, 200, 'Successful'));
				});
			});
			waw.app.post("/api/"+opts.part+"/avatar/delete", opts.ensure || waw.role('admin'), function(req, res) {
				opts.schema.findOne(typeof opts.query == 'function' && opts.query(req, res) || {
					moderators: req.user&&req.user._id,
					_id: req.body._id
				}, function(err, doc) {
					if(err || !doc) return res.json(waw.resp(null, 400, 'Unsuccessful update'));
					let removed = false;
					for (var i = doc.thumbs.length - 1; i >= 0; i--) {
						if(doc.thumbs[i] == req.body.url){
							removed = true;
							doc.thumbs.splice(i, 1);
						}
					}
					if(removed){
						waw.parallel([function(done){
							doc.save(done);
						}, function(done){
							let location = opts.dirname + req.body.url.split('/').pop();
							if (fs.existsSync(location)) fs.unlink(location, done);
						}], function(){
							res.json(waw.resp(removed, 200, 'Successful'));
						});
					}else res.json(waw.resp(removed, 300, 'Not Found Picture'));
				});
			});
			const serve_file = function(req, res) {
				if (fs.existsSync(opts.dirname + req.params.file)) {
					res.sendFile(opts.dirname + req.params.file);
				}else{
					res.sendFile(opts.default || __dirname+'/default.png');
				}
			};
			waw.app.get("/api/"+opts.part+"/file/:file", serve_file);
			waw.app.get("/api/"+opts.part+"/file/:file/:name", serve_file);
			waw.app.get("/api/"+opts.part+"/avatar/:file", serve_file);
			waw.app.get("/api/"+opts.part+"/avatar/:file/:name", serve_file);
		}
		waw.ensure_file = function(opts, extra){
			return function(req, res, next){
				waw.parallel([function(done) {
					if(req.body.thumb){
						if(!req.body._id) req.body._id = mongoose.Types.ObjectId();
						let dataUrl = req.body.thumb;
						req.body.thumb = '/api/'+opts.part+'/avatar/' + req.body._id + '.jpg?' + Date.now();
						waw.dataUrlToLocation(dataUrl, opts.dirname, req.body._id + '.jpg', done);
					}else done();
				}, function(done) {
					if(req.body.thumbs){
						waw.each(req.body.thumbs, (thumb, cb, i)=>{
							let _id = mongoose.Types.ObjectId();
							let dataUrl = req.body.thumbs[i];
							req.body.thumbs[i] = '/api/'+opts.part+'/avatar/' + _id + '.jpg?' + Date.now();
							waw.dataUrlToLocation(dataUrl, opts.dirname, _id + '.jpg', cb);
						}, done);
					}else done();
				}], function() {
					if(extra) extra(req, res, next);
					else next();
				});
			}
		}
	/*
	*	End of
	*/
}

/*

move to user
waw.socket.add(function(socket){
	if (socket.request.user) {
		socket.join(socket.request.user._id);
	}	
})

/*
const passportSocketIo = require("passport.socketio");
io.use(passportSocketIo.authorize({
	passport: sd._passport,
	cookieParser: cookieParser,
	key: 'express.sid.'+sd._config.prefix,
	secret: 'thisIsCoolSecretFromWaWFramework'+sd._config.prefix,
	store: store,
	success: function(data, accept) {
		accept();
	},
	fail: function(data, message, error, accept) {
		accept();
	}
}));

// sending to sender-client only
socket.emit('message', "this is a test");
// sending to all clients, include sender
io.emit('message', "this is a test");
// sending to all clients except sender
socket.broadcast.emit('message', "this is a test");
// sending to all clients in 'game' room(channel) except sender
socket.broadcast.to('game').emit('message', 'nice game');
// sending to all clients in 'game' room(channel), include sender
io.in('game').emit('message', 'cool game');
// sending to sender client, only if they are in 'game' room(channel)
socket.to('game').emit('message', 'enjoy the game');
// sending to all clients in namespace 'myNamespace', include sender
io.of('myNamespace').emit('message', 'gg');
// sending to individual socketid
socket.broadcast.to(socketid).emit('message', 'for your eyes only');
*/