const express = require('express');
var session = require('express-session');
const app = express();
const server = require('http').Server(app);
const favicon = require('serve-favicon');
const cookieParser = require('cookie-parser');
const methodOverride = require('method-override');
const bodyParser = require('body-parser');
const derer = require('derer');
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

	if(waw.config.icon && waw.fs.existsSync(process.cwd() + waw.config.icon))
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
	*	Middleware
	*/
		const middlewares = {};
		waw.middleware = function(which, req, res, next){
			if(typeof middlewares[which] == 'function'){
				middlewares[which](req, res, next);
			}else next({});
		}
		waw.set_middleware = function(which, cb){
			if(typeof cb == 'function' && which){
				middlewares[which] = cb;
			}				
		}
	/*
	*	Express Middleware Support
	*/
		waw.next = (req, res, next)=>next()
		waw.ensure = (req, res, next)=>{
			if(req.user) next();
			else res.json(false);
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
	*	End of
	*/
}