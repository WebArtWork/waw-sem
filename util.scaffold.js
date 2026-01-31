const path = require('node:path');

/*
 *	Modules Management (waw add / waw a)
 */
const defaults = {
	module: {
		default: path.join(__dirname, "module", "default"),
	},
};

module.exports.newModule = async function newModule(waw) {
	const t = waw.terminal();

	let name = null;
	if (waw.argv && (waw.argv[0] === "add" || waw.argv[0] === "a"))
		name = waw.argv[1];
	else name = waw.argv && waw.argv[0];

	if (!name) name = await t.ask("Module name:", { required: true });

	name = name.toLowerCase();

	const base = path.join(waw.modulesPath, name);
	if (waw.isDir(base)) {
		console.log("Module already exists");
		t.close();
		process.exit(1);
	}

	// TODO implement custom template
	let templatePath = defaults.module.default;

	const scaffoldPath = path.join(templatePath, "scaffold.js");
	if (!waw.isFile(scaffoldPath)) {
		console.log(`Missing scaffold.js in template: ${templatePath}`);
		t.close();
		process.exit(1);
	}

	const scaffold = require(scaffoldPath);
	if (typeof scaffold !== "function") {
		console.log(`Template scaffold.js must export a function: ${scaffoldPath}`);
		t.close();
		process.exit(1);
	}

	const ctx = {
		...waw,
		git,
		// template inputs
		name,
		Name: name.charAt(0).toUpperCase() + name.slice(1),

		// paths
		base, // target module folder
		template: templatePath, // template root folder
		projectPath: waw.projectPath,
	};

	try {
		await scaffold(ctx);
		console.log("Module has been created");
		t.close();
		process.exit();
	} catch (e) {
		console.log("Failed to create module");
		t.close();
		process.exit(1);
	}
};
