module.exports = function(waw) {
	waw.resp = function(body){
		return body;
	}
	/*
	*	Crud Fill
	*/
		var fill_crud = function(part, which, config){
			var prefix = which+'_'+part+(config.name&&('_'+config.name)||'');
			if(typeof config.required == 'string'){
				config.required = config.required.split(' ');
			}
			if(Array.isArray(config.required)){
				waw['required_'+prefix] = config.required;
			}
			if(typeof config.ensure == 'function'){
				waw['ensure_'+prefix] = config.ensure;
			}
			if(typeof config.query == 'function'){
				waw['query_'+prefix] = config.query;
			}
			if(typeof config.sort == 'function'){
				waw['sort_'+prefix] = config.sort;
			}
			if(typeof config.skip == 'function'){
				waw['skip_'+prefix] = config.skip;
			}
			if(typeof config.limit == 'function'){
				waw['limit_'+prefix] = config.limit;
			}
			if(typeof config.select == 'function'){
				waw['select_'+prefix] = config.select;
			}
			if(typeof config.populate == 'function'){
				waw['populate_'+prefix] = config.populate;
			}
		}
		const crudTypes = ['create', 'get', 'fetch', 'update', 'unique', 'delete'];
		waw.crud = function(part, config){
			for (let i = 0; i < crudTypes.length; i++) {
				if(Array.isArray(config[crudTypes[i]])){
					for (let j = 0; j < config[crudTypes[i]].length; j++) {
						if(typeof config[crudTypes[i]][j] != 'object') continue;
						fill_crud(part, crudTypes[i], config[crudTypes[i]][j]);
					}
				}else if(typeof config[crudTypes[i]] == 'object'){
					fill_crud(part, crudTypes[i], config[crudTypes[i]]);
				}
			}
		};
	/*
	*	Crud Use
	*/
		const ensure = function(name){
			return function(req, res, next){
				let required = waw[name.replace('ensure_','required_')];
				if(required){
					for (var i = 0; i < required.length; i++) {
						if(!req.body[required[i]]){
							return res.json(waw.resp(null, 410, required[i]+' field should not be left blank.'));
						}
					}
				}
				if(typeof waw[name] == 'function'){
					waw[name](req, res, next);
				}else{
					waw.ensure(req, res, next);
				}
			}
		}
		var add_crud = function(crud, part, unique=true){
			var partName = part.name.toLowerCase();
			var crudName = crud.name.toLowerCase();
			var Schema = part.__root + '/schema_' + crudName+ '.js';
			if(unique) Schema = part.__root + '/schema.js';
			if (!waw.fs.existsSync(Schema)) {
				var data = waw.fs.readFileSync(__dirname+'/schema.js', 'utf8');
				data = data.split('CNAME').join(crudName.toString().charAt(0).toUpperCase() + crudName.toString().substr(1).toLowerCase());
				data = data.split('NAME').join(crudName);
				waw.fs.writeFileSync(Schema, data, 'utf8');
			}
			Schema = require(Schema);
			if(typeof Schema == 'function' && !Schema.name){
				Schema = Schema(waw);
			}
			var router = waw.router('/api/'+crudName);
			var save = function(doc, res, emit){
				doc.save(function(err){
					if(err){
						console.log(err);
						return res.json(waw.resp(null, 400, 'Unsuccessful update'));
					}
					waw.emit(emit, doc);
					res.json(waw.resp(doc, 200, 'Successful'));
				});
			}
			/*
			*	Create
			*/
				router.post("/create", ensure('ensure_create_'+crudName), function(req, res) {
					var doc = new Schema();
					if(typeof doc.create !== 'function'){
						return res.json(waw.resp(null, 400, 'Unsuccessful update'));
					}
					doc.create(req.body, req.user, waw);
					save(doc, res, crudName+'_create');
				});
			/*
			*	Read
			*/
				var get_unique = {};
				var crud_get = function(name){
					if(get_unique[name]) return;
					get_unique[name] = true;
					var final_name = '_get_'+crudName;
					if(name) final_name += '_'+name;
					router.get("/get"+name, ensure('ensure'+final_name), function(req, res) {
						var query = waw['query'+final_name]&&waw['query'+final_name](req, res)||{
							moderators: req.user&&req.user._id
						};
						query = Schema.find(query);
						var sort = waw['sort'+final_name]&&waw['sort'+final_name](req, res)||false;
						if(sort){
							query.sort(sort);
						}
						var skip = waw['skip'+final_name]&&waw['skip'+final_name](req, res)||false;
						if(skip){
							query.skip(skip);
						}
						var limit = waw['limit'+final_name]&&waw['limit'+final_name](req, res)||false;
						if(limit){
							query.limit(limit);
						}
						var select = waw['select'+final_name]&&waw['select'+final_name](req, res)||false;
						if(select){
							query.select(select);
						}
						var populate = waw['populate'+final_name]&&waw['populate'+final_name](req, res)||false;
						if(populate){
							query.populate(populate);
						}
						query.exec(function(err, docs) {
							if(err){
								return res.json(waw.resp(null, 400, 'Unsuccessful query'));
							}
							res.json(waw.resp(docs || [], 200, 'Successful'));
						});
					});
				}
				if(Array.isArray(crud.get)){
					for (var i = 0; i < crud.get.length; i++) {
						crud_get(crud.get[i]);
					}
				}else if(typeof crud.get == 'string') crud_get(crud.get[i]);
				else crud_get('');
			/*
			*	Fetch
			*/
				var crud_fetch = function(name){
					let final_name = '_fetch_'+crudName;
					if(name) final_name += '_'+name;
					router.post("/fetch"+(name||''), ensure('ensure'+final_name), function(req, res) {
						let q = Schema.findOne(waw['query'+final_name]&&waw['query'+final_name](req, res)||{
							_id: req.body._id,
							moderators: req.user&&req.user._id
						})
						if(typeof waw['select'+final_name] == 'function'){
							q.select(waw['select'+final_name](req, res));
						}
						var populate = waw['populate'+final_name]&&waw['populate'+final_name](req, res)||false;
						if(populate){
							query.populate(populate);
						}
						q.exec(function(err, doc){
							if(err||!doc){
								err&&console.log(err);
								return res.json(waw.resp(null, 400, 'Unsuccessful query'));
							}
							res.json(waw.resp(doc, 200, 'Successful'));
						});
					});
				}
				if(Array.isArray(crud.fetch)){
					for (var i = 0; i < crud.fetch.length; i++) {
						crud_fetch(crud.fetch[i]);
					}
				}else crud_fetch('');
			/*
			*	Update
			*/
				var crud_update = function(upd){
					let final_name = '_update_'+crudName;
					if(upd.name) final_name += '_'+upd.name;
					router.post("/update"+(upd.name||''), ensure('ensure'+final_name), function(req, res) {
						let q = Schema.findOne(waw['query'+final_name]&&waw['query'+final_name](req, res)||{
							_id: req.body._id,
							moderators: req.user&&req.user._id
						})
						if(typeof waw['select'+final_name] == 'function'){
							q.select(waw['select'+final_name](req, res));
						}
						q.exec(function(err, doc){
							if(err||!doc){
								err&&console.log(err);
								return res.json(waw.resp(null, 400, 'Document not found'));
							}
							for (var i = 0; i < upd.keys.length; i++) {
								doc[upd.keys[i]] = req.body[upd.keys[i]];
								doc.markModified(upd.keys[i]);
							}
							save(doc, res, crudName+'_update');
						});
					});
				}
				if(Array.isArray(crud.update)){
					for (var i = 0; i < crud.update.length; i++) {
						crud_update(crud.update[i]);
					}
				}else if(typeof crud.update == 'object') crud_update(crud.update);
			/*
			*	Unique
			*/
				var crud_unique = function(upd){
					let final_name = '_unique_'+crudName;
					if(upd.name) final_name += '_'+upd.name;
					router.post("/unique"+(upd.name||''), ensure('ensure'+final_name), function(req, res) {
						let q = Schema.findOne(waw['query'+final_name]&&waw['query'+final_name](req, res)||{
							_id: req.body._id,
							moderators: req.user&&req.user._id
						});
						if(typeof waw['select'+final_name] == 'function'){
							q.select(waw['select'+final_name](req, res));
						}
						q.exec(function(err, doc){
							if(err||!doc) return res.json(waw.resp(null, 400, 'Document not found'));
							let query = waw['select'+final_name]&&waw['select'+final_name](req, res, upd);
							if(!query){
								query = {};
								query[upd.key] = req.body[upd.key];
							}
							Schema.findOne(query, function(err, sdoc){
								if(sdoc) return res.json(waw.resp(doc[upd.key], 400, 'Already Exists'));
								doc[upd.key] = req.body[upd.key];
								doc.markModified(upd.key);
								doc.save(function(err){
									res.json(waw.resp(doc[upd.key], 200, 'Successful'));
								});
							});
						});
					});
				}
				if(Array.isArray(crud.unique)){
					for (var i = 0; i < crud.unique.length; i++) {
						crud_unique(crud.unique[i]);
					}
				}else if(typeof crud.unique == 'object') crud_unique(crud.unique);
			/*  
			*	Delete
			*/
				var crud_delete = function(name){
					let final_name = '_delete_'+crudName;
					if(name) final_name += '_'+name;
					router.post("/delete"+name, ensure('ensure'+final_name), function(req, res) {
						let q = Schema.findOne(waw['query' + final_name] && waw['query' + final_name](req, res) || {
							_id: req.body._id,
							author: req.user._id
						})
						let populate = waw['populate'+final_name]&&waw['populate'+final_name](req, res)||false;
						if(populate){
							q.populate(populate);
						}
						q.exec(function(err, doc) {
							if(err||!doc) return res.json(waw.resp(null, 400, 'Unsuccessful query'));
							Schema.deleteOne(waw['query' + final_name] && waw['query' + final_name](req, res) || {
								_id: req.body._id,
								author: req.user._id
							}, function(err) {
								if (err){
									res.json(waw.resp(null, 400, 'Unsuccessful query'));
								}else{
									if(typeof waw['on'+name] == 'function'){
										waw['on'+name](doc, req, res);
									}
									waw.emit(crudName+'_delete', doc);
									res.json(waw.resp(true, 200, 'Successful'));
								}
							});
						});
					});
				}
				if(crud.delete){
					for (var i = 0; i < crud.delete.length; i++) {
						crud_delete(crud.delete[i]||'');
					}
				}
			/*
			*	End of CRUD
			*/
		}
		for (var i = 0; i < waw.parts.length; i++) {
			if(waw.parts[i].crud){
				if(Array.isArray(waw.parts[i].crud)){
					for (var j = 0; j < waw.parts[i].crud.length; j++) {
						add_crud(waw.parts[i].crud[j], waw.parts[i], false);
					}
				}else{
					if(!waw.parts[i].crud.name){
						waw.parts[i].crud.name = waw.parts[i].name
					}
					add_crud(waw.parts[i].crud, waw.parts[i]);
				}
			}
		}
	/*
	*	Support for 0.x version of waw until 2.0
	*/
};
