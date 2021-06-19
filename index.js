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
const io = require('socket.io')(server, {
	cors: {
		origins: '*:*',
		methods: ["GET", "POST"],
		transports: ['websocket', 'polling'],
		credentials: false
	},
	allowEIO3: true
});

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
		waw.next = (req, res, next)=>next();
		waw.block = (req, res)=>res.send(false);
		waw.next_user = (req, res, next)=>{
			if(!req.user){
				req.user = {
					_id: req.sessionID
				};
			}
			next();
		};
		const methods = {
			admin: {
				create: {
					ensure: waw.role('admin')
				},
				get: {
					ensure: waw.role('admin')
				},
				fetch: {
					ensure: waw.role('admin')
				},
				update: {
					ensure: waw.role('admin')
				},
				delete: {
					ensure: waw.role('admin')
				}
			},
			all: {
				get: {
					query: ()=>{return {}}
				}
			},
			author: {
				get: {
					query: (req)=>{ return {author: req.user._id} }
				},
				update: {
					query: (req)=>{ return { _id: req.body._id, author: req.user._id} }
				}
			},
			offline: {
				create: {
					ensure: waw.next_user
				},
				get: {
					ensure: waw.next_user
				},
				update: {
					ensure: waw.next_user					
				},
				delete: {
					ensure: waw.next_user
				}
			}
		};
		waw.crud_method = (use, config)=>{
			if (typeof use == 'string') {
				use = use.split(' ');
			}
			if(!config) config={};
			for (var i = 0; i < use.length; i++) {
				if(methods[use[i]]){
					for(let type in methods[use[i]]){
						if(!config[type]){
							config[type] = {};
						}
						for(let func in methods[use[i]][type]){
							if(config[type][func]) continue;
							config[type][func] = methods[use[i]][type][func];
						}
					}
				}
			}
			return config;
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
		waw.derer.setFilter('mongodate',function(_id){
			if(!_id) return new Date();
			let timestamp = _id.toString().substring(0,8);
			return new Date(parseInt(timestamp,16)*1000);
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