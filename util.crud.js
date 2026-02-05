module.exports = function (waw) {
	/*
	*	Crud Fill
	*/
	const fillCrud = function (part, which, config) {
		const prefix =
			which + "_" + part + ((config.name && "_" + config.name) || "");
		if (typeof config.required == "string") {
			config.required = config.required.split(" ");
		}
		if (Array.isArray(config.required)) {
			waw["required_" + prefix] = config.required;
		}
		if (typeof config.ensure == "function") {
			waw["ensure_" + prefix] = config.ensure;
		}
		if (typeof config.query == "function") {
			waw["query_" + prefix] = config.query;
		}
		if (typeof config.sort == "function") {
			waw["sort_" + prefix] = config.sort;
		}
		if (typeof config.skip == "function") {
			waw["skip_" + prefix] = config.skip;
		}
		if (typeof config.limit == "function") {
			waw["limit_" + prefix] = config.limit;
		}
		if (typeof config.select == "function") {
			waw["select_" + prefix] = config.select;
		}
		if (typeof config.populate == "function") {
			waw["populate_" + prefix] = config.populate;
		}
	};
	const crudTypes = ["create", "get", "fetch", "update", "unique", "delete"];
	waw.crud = {};
	waw.crud.config = function (part, config) {
		for (let i = 0; i < crudTypes.length; i++) {
			if (Array.isArray(config[crudTypes[i]])) {
				for (let j = 0; j < config[crudTypes[i]].length; j++) {
					if (typeof config[crudTypes[i]][j] != "object") continue;
					fillCrud(part, crudTypes[i], config[crudTypes[i]][j]);
				}
			} else if (typeof config[crudTypes[i]] == "object") {
				fillCrud(part, crudTypes[i], config[crudTypes[i]]);
			}
		}
	};
	/*
	*	Crud Use
	*/
	const ensure = function (name) {
		return function (req, res, next) {
			let required = waw[name.replace("ensure_", "required_")];
			if (required) {
				for (let i = 0; i < required.length; i++) {
					if (!req.body[required[i]]) {
						return res.json(
							waw.resp(
								null,
								410,
								required[i] + " field should not be left blank."
							)
						);
					}
				}
			}
			if (typeof waw[name] == "function") {
				waw[name](req, res, next);
			} else {
				waw.ensure(req, res, next);
			}
		};
	};

	waw.crud.register = function (crud, part, unique = true) {
		const crudName = crud.name.toString().toLowerCase();
		const crudCapitalName =
			crudName.charAt(0).toUpperCase() + crudName.substr(1).toLowerCase();

		const schemaPath = unique
			? part.__root + "/schema.js"
			: part.__root + "/schema_" + crudName + ".js";

		// if (!waw[crudCapitalName] && !fs.existsSync(schemaPath)) {
		// 	let data = fs.readFileSync(__dirname + "/schema.js", "utf8");

		// 	data = data
		// 		.split("CNAME")
		// 		.join(crudCapitalName);

		// 	data = data.split("NAME").join(crudName);

		// 	fs.writeFileSync(schemaPath, data, "utf8");
		// }

		let Schema = waw[crudCapitalName]
			? waw[crudCapitalName]
			: require(schemaPath);

		if (typeof Schema === "function" && !Schema.name) {
			Schema = Schema(waw);
		}

		const router = waw.router("/api/" + crudName);

		const save = async (doc, res, emit) => {
			await doc.save();

			waw.emit(emit, doc);

			res.json(waw.resp(doc, 200, "Successful"));
		};
		/*
		*	Create
		*/
		router.post(
			"/create",
			ensure("ensure_create_" + crudName),
			function (req, res) {
				const doc = new Schema(req.body || {});

				const final_name = "_create_" + crudName;

				if (typeof doc.create === "function") {
					doc.create(req.body, req.user, waw);
				}

				if (typeof waw["query" + final_name] === "function") {
					const fields = waw["query" + final_name](req);

					for (const field in fields) {
						doc[field] = fields[field];
					}
				}

				save(doc, res, crudName + "_create");
			}
		);
		/*
		*	Read
		*/
		const get_unique = {};
		const _sort = (params) => {
			const sort = {};
			sort[params.sort] = params.sortOrder ? Number(params.sortOrder) : 1;
			return sort;
		};
		const crud_get = function (name) {
			if (get_unique[name]) return;
			get_unique[name] = true;
			var final_name = "_get_" + crudName;
			if (name) final_name += "_" + name;
			router.get(
				"/get" + name,
				ensure("ensure" + final_name),
				async (req, res) => {
					let query = (waw["query" + final_name] &&
						waw["query" + final_name](req, res)) || {
						moderators: req.user && req.user._id,
					};
					query = Schema.find(query);

					const sort =
						typeof waw["sort" + final_name] === "function"
							? waw["sort" + final_name](req, res)
							: req.query.sort
								? _sort(req.query)
								: false;
					if (sort) {
						query.sort(sort);
					}
					const skip =
						typeof waw["skip" + final_name] === "function"
							? waw["skip" + final_name](req, res)
							: req.query.skip || false;
					if (skip) {
						query.skip(Number(skip));
					}
					const limit =
						typeof waw["limit" + final_name] === "function"
							? waw["limit" + final_name](req, res)
							: req.query.limit || false;
					if (limit) {
						query.limit(Number(limit));
					}
					let select =
						(waw["select" + final_name] &&
							waw["select" + final_name](req, res)) ||
						false;
					if (select) {
						query.select(select);
					}
					let populate =
						(waw["populate" + final_name] &&
							waw["populate" + final_name](req, res)) ||
						false;
					if (populate) {
						query.populate(populate);
					}
					const docs = await query.exec();
					res.json(waw.resp(docs || [], 200, "Successful"));
				}
			);
		};
		if (Array.isArray(crud.get)) {
			for (let i = 0; i < crud.get.length; i++) {
				crud_get(crud.get[i]);
			}
		} else if (typeof crud.get == "string") {
			crud_get(crud.get);
		} else {
			crud_get("");
		}
		/*
		*	Fetch
		*/
		const crud_fetch = function (name) {
			let final_name = "_fetch_" + crudName;
			if (name) final_name += "_" + name;
			router.post(
				"/fetch" + (name || ""),
				ensure("ensure" + final_name),
				async (req, res) => {
					let q = Schema.findOne(
						(waw["query" + final_name] &&
							waw["query" + final_name](req, res)) || {
							_id: req.body._id,
							moderators: req.user && req.user._id,
						}
					);
					if (typeof waw["select" + final_name] == "function") {
						q.select(waw["select" + final_name](req, res));
					}
					var populate =
						(waw["populate" + final_name] &&
							waw["populate" + final_name](req, res)) ||
						false;
					if (populate) {
						q.populate(populate);
					}
					const doc = await q.exec();
					res.json(waw.resp(doc, 200, "Successful"));
				}
			);
		};
		if (Array.isArray(crud.fetch)) {
			for (let i = 0; i < crud.fetch.length; i++) {
				crud_fetch(crud.fetch[i]);
			}
		} else crud_fetch("");
		/*
		*	Update
		*/
		const crud_update = function (upd) {
			let final_name = "_update_" + crudName;
			if (upd.name) final_name += "_" + upd.name;
			router.post(
				"/update" + (upd.name || ""),
				ensure("ensure" + final_name),
				async (req, res) => {
					let q = Schema.findOne(
						(waw["query" + final_name] &&
							waw["query" + final_name](req, res)) || {
							_id: req.body._id,
							moderators: req.user && req.user._id,
						}
					);
					if (typeof waw["select" + final_name] == "function") {
						q.select(waw["select" + final_name](req, res));
					}
					const doc = await q.exec();

					for (var i = 0; i < upd.keys.length; i++) {
						doc[upd.keys[i]] = req.body[upd.keys[i]];
						doc.markModified(upd.keys[i]);
					}
					save(doc, res, crudName + "_update");
				}
			);
		};
		if (Array.isArray(crud.update)) {
			for (var i = 0; i < crud.update.length; i++) {
				crud_update(crud.update[i]);
			}
		} else if (typeof crud.update == "object") crud_update(crud.update);
		/*
		*	Unique
		*/
		var crud_unique = function (upd) {
			if (typeof upd === "string") {
				upd = {
					name: upd,
				};
			}
			let final_name = "_unique_" + crudName;
			if (upd.name) final_name += "_" + upd.name;
			router.post(
				"/unique" + (upd.name || ""),
				ensure("ensure" + final_name),
				async (req, res) => {
					const document = await Schema.findOne(
						(waw["query" + final_name] &&
							waw["query" + final_name](req, res)) || {
							_id: req.body._id,
							moderators: req.user && req.user._id,
						}
					);

					if (!document) {
						return res.json(waw.resp(false, 401, "No found"));
					}

					const countQuery = {
						_id: {
							$ne: req.body._id,
						},
					};
					countQuery[upd.name] = req.body[upd.name];

					if (await Schema.countDocuments(countQuery)) {
						res.json(
							waw.resp(
								document[upd.name] || "",
								200,
								"Successful"
							)
						);
					} else {
						document[upd.name] = req.body[upd.name];

						await document.save();

						res.json(
							waw.resp(
								document[upd.name] || "",
								200,
								"Successful"
							)
						);
					}
				}
			);
		};
		if (Array.isArray(crud.unique)) {
			for (var i = 0; i < crud.unique.length; i++) {
				crud_unique(crud.unique[i]);
			}
		} else if (typeof crud.unique == "object") crud_unique(crud.unique);
		/*
		*	Delete
		*/
		var crud_delete = function (name) {
			let final_name = "_delete_" + crudName;
			if (name) final_name += "_" + name;
			router.post(
				"/delete" + name,
				ensure("ensure" + final_name),
				async (req, res) => {
					let q = Schema.findOne(
						(waw["query" + final_name] &&
							waw["query" + final_name](req, res)) || {
							_id: req.body._id,
							author: req.user._id,
						}
					);
					let populate =
						(waw["populate" + final_name] &&
							waw["populate" + final_name](req, res)) ||
						false;
					if (populate) {
						q.populate(populate);
					}
					const doc = await q.exec();
					await Schema.deleteOne(
						(waw["query" + final_name] &&
							waw["query" + final_name](req, res)) || {
							_id: req.body._id,
							author: req.user._id,
						}
					);
					if (typeof waw["on" + name] == "function") {
						waw["on" + name](doc, req, res);
					}
					waw.emit(crudName + "_delete", doc);
					res.json(waw.resp(true, 200, "Successful"));
				}
			);
		};
		if (crud.delete) {
			for (var i = 0; i < crud.delete.length; i++) {
				crud_delete(crud.delete[i] || "");
			}
		}
		/*
		*	End of CRUD
		*/
	};

	waw.crud.finalize = () => {
		for (var i = 0; i < waw.modules.length; i++) {
			if (waw.modules[i].crud) {
				if (Array.isArray(waw.modules[i].crud)) {
					for (var j = 0; j < waw.modules[i].crud.length; j++) {
						if (waw.modules[i].crud[j].name) {
							waw.crud.register(waw.modules[i].crud[j], waw.modules[i], false);
						} else {
							console.log(
								"CRUD on module " +
								waw.modules[i].name +
								" is not used because there is no name."
							);
						}
					}
				} else {
					if (!waw.modules[i].crud.name) {
						waw.modules[i].crud.name = waw.modules[i].name;
					}
					waw.crud.register(waw.modules[i].crud, waw.modules[i]);
				}
			}
		}
	}
};
