module.exports = function(waw) {
	/*
	*	Crud Fill
	*/
		var fill_crud = function(part, which, config){
			var prefix = which+'_'+part+(config.name&&('_'+config.name)||'');
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
		const crudTypes = ['create', 'get', 'update', 'unique', 'delete'];
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
			var Schema = process.cwd() + '/server/' + partName + '/schema_' + crudName+ '.js';
			if(unique) Schema = process.cwd() + '/server/' + partName + '/schema.js';
			if (!waw.fs.existsSync(Schema)) {
				var data = waw.fs.readFileSync(__dirname+'/schema.js', 'utf8');
				data = data.split('CNAME').join(crudName.toString().charAt(0).toUpperCase() + crudName.toString().substr(1).toLowerCase());
				data = data.split('NAME').join(crudName);
				waw.fs.writeFileSync(Schema, data, 'utf8');
			}
			Schema = require(Schema);
			var router = waw.router('/api/'+crudName);
			var save = function(doc, res){
				doc.save(function(err){
					if(err){
						console.log(err);
						return res.json(false);
					}
					res.json(doc);
				});
			}
			/*
			*	Create
			*/
				router.post("/create", ensure('ensure_create_'+crudName), function(req, res) {
					var doc = new Schema();
					if(typeof doc.create !== 'function'){
						return res.json(false);
					}
					doc.create(req.body, req.user, waw);
					save(doc, res);
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
								console.log(err);
							}
							res.json(docs || []);
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
			*	Update
			*/
				var crud_update = function(upd){
					let final_name = '_update_'+crudName;
					if(upd.name) final_name += '_'+upd.name;
					router.post("/update"+(upd.name||''), ensure('ensure'+final_name), function(req, res) {
						Schema.findOne(waw['query'+final_name]&&waw['query'+final_name](req, res)||{
							_id: req.body._id,
							moderators: req.user&&req.user._id
						}, function(err, doc){
							console.log(doc);
							if(err||!doc){
								err&&console.log(err);
								return res.json(false);
							}
							for (var i = 0; i < upd.keys.length; i++) {
								doc[upd.keys[i]] = req.body[upd.keys[i]];
								doc.markModified(upd.keys[i]);
							}
							save(doc, res);
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
						Schema.findOne(waw['query'+final_name]&&waw['query'+final_name](req, res)||{
							_id: req.body._id,
							moderators: req.user&&req.user._id
						}, function(err, doc){
							if(err||!doc) return res.json(false);
							let query = waw['select'+final_name]&&waw['select'+final_name](req, res, upd);
							if(!query){
								query = {};
								query[upd.key] = req.body[upd.key];
							}
							Schema.findOne(query, function(err, sdoc){
								if(sdoc) return res.json(doc[upd.key]);
								doc[upd.key] = req.body[upd.key];
								doc.markModified(upd.key);
								doc.save(function(err){
									res.json(doc[upd.key]);
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
							if(err||!doc) return res.json(false);
							Schema.deleteOne(waw['query' + final_name] && waw['query' + final_name](req, res) || {
								_id: req.body._id,
								author: req.user._id
							}, function(err) {
								if (err){
									res.json(false);
								}else{
									if(typeof waw['on'+name] == 'function'){
										waw['on'+name](doc, req, res);
									}
									res.json(true);
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
