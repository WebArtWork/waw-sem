const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const express = require('express');
const session = require('express-session');
const app = express();
const server = require('http').Server(app);
const favicon = require('serve-favicon');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const io = require('socket.io')(server, {
	cors: {
		origins: '*:*',
		transports: ['websocket', 'polling'],
		credentials: false
	},
	allowEIO3: true
});

module.exports = function(waw){
	waw.mongoose = mongoose;

	const sessionMaxAge = typeof waw.config.session === 'number' ? waw.config.session : 365 * 24 * 60 * 60 * 1000;

	let store;

	if(waw.config.mongo){
		let mongoAuth = '';
		if(waw.config.mongo.user&&waw.config.mongo.pass){
			mongoAuth = waw.config.mongo.user + ':' + waw.config.mongo.pass + '@';
		}
		waw.mongoUrl = 'mongodb://'+mongoAuth+(waw.config.mongo.host||'localhost')+':'+(waw.config.mongo.port||'27017')+'/'+(waw.config.mongo.db||'test');
	}

	if (
		waw.mongoose.connection.readyState == 0 &&
		waw.mongoUrl
	) {
		waw.mongoose.connect(waw.mongoUrl, {
			useUnifiedTopology: true,
			useNewUrlParser: true,
			// useCreateIndex: true
		});

		waw.mongoose.Promise = global.Promise;
	}

	if (waw.mongoUrl) {
		const MongoStore = require('connect-mongo');
		store = MongoStore.create({ mongoUrl: waw.mongoUrl });
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

	if (
		waw.config.icon &&
		fs.existsSync(process.cwd() + waw.config.icon)
	) {
		app.use(favicon(process.cwd() + waw.config.icon));
	}

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
			const router = express.Router();

			app.use(api, router);

			return router;
		}

		waw.app = app;

		waw.express = express;
	/*
 	* Compressin
  	*/
   		const compression = require('compression')
     		app.use(compression());

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
				if(typeof which === 'function'){
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

		waw.role = function(roles, middleware){
			if (typeof roles === 'string') {
				roles = roles.split(' ');
			}
			return function(req, res, next){
				if(req.user && req.user.is){
					for (let i = 0; i < roles.length; i++) {
						if(req.user.is[roles[i]]){
							if(middleware) middleware(req, res, next);
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
waw.socket.add(function(socket){
	if (socket.request.user) {
		socket.join(socket.request.user._id);
	}
})

/*
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
