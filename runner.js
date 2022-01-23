const fs = require('fs');
const readline = require('readline').createInterface({
	input: process.stdin,
	output: process.stdout
});
/*
*	Create new part
*/
	const cname = function(text){
		return text.toString().charAt(0).toUpperCase() + text.toString().substr(1).toLowerCase();
	}
	const rpl = function(text, from, to){
		return text.split(from).join(to);
	}
	const list = {
		'1) Default Module': 'default'
	};
	const generate_local = function(waw) {
		if (Object.keys(list) > 1 && !waw.local_module) {
			let text = 'Which module you want to start with?', counter=0, modules={};
			for(let key in list){
				modules[++counter] = list[key];
				text += '\n'+key;
			}
			text += '\nChoose number: ';
			return readline.question(text, function(answer){
				if(answer && modules[parseInt(answer)]){
					waw.local_module = modules[parseInt(answer)];
				}
				generate_local(waw);
			});
		}
		if (!waw.local_module) {
			waw.local_module = 'default';
		}
		let data;
		fs.mkdirSync(waw.folder, { recursive: true });
		// index.js
		data = fs.readFileSync(__dirname+'/modules/'+waw.local_module+'/index.js', 'utf8');
		data = rpl(data, 'CNAME', cname(waw.new_module.name));
		data = rpl(data, 'NAME', waw.new_module.name.toLowerCase());
		fs.writeFileSync(waw.folder+'/index.js', data, 'utf8');
		// module.json
		data = fs.readFileSync(__dirname+'/modules/'+waw.local_module+'/module.json', 'utf8');
		data = rpl(data, 'CNAME', cname(waw.new_module.name));
		data = rpl(data, 'NAME', waw.new_module.name.toLowerCase());
		fs.writeFileSync(waw.folder+'/module.json', data, 'utf8');
		// schema.js1
		data = fs.readFileSync(__dirname+'/modules/'+waw.local_module+'/schema.js', 'utf8');
		data = rpl(data, 'CNAME', cname(waw.new_module.name));
		data = rpl(data, 'NAME', waw.new_module.name.toLowerCase());
		fs.writeFileSync(waw.folder+'/schema.js', data, 'utf8');
		console.log('Module has been created');
		process.exit(1);
	}
	const new_module = function(waw) {
		if (!waw.config.server) {
			console.log('You are located not in waw project');
			process.exit(1);
		}
		if (!fs.existsSync(process.cwd()+'/config.json')) {
			console.log('You are located not in waw project');
			process.exit(0);
		}
		if(!waw.new_module) waw.new_module={};
		if(!waw.new_module.name){
			if(waw.argv.length){
				if (fs.existsSync(process.cwd()+'/server/'+waw.argv[0].toLowerCase())) {
					console.log('This module already exists in current project');
					process.exit(0);
				}else{
					waw.new_module.name = waw.argv[0];
				}
			}else{
				return readline.question('Provide name for the module you want to create: ', function(answer){
					if(answer){
						if (fs.existsSync(process.cwd()+'/'+answer.toLowerCase())) {
							console.log('This module already exists in current project');
						}else{
							waw.new_module.name = answer;
						}
					}else{
						console.log('Please type your module name');
					}
					new_module(waw);
				});
			}
		}
		waw.folder = process.cwd()+'/server/'+waw.new_module.name.toLowerCase();
		if(waw.argv.length > 1){
			fs.mkdirSync(waw.folder, { recursive: true });
			waw.fetch(waw.folder, waw.argv[1], ()=>{
				console.log('Module has been created');
				process.exit(1);
			}, waw.argv.length > 2 ? waw.argv[2] : 'master');
		}else generate_local(waw);
	};
	module.exports.add = new_module;
	module.exports.a = new_module;
/*
*	End of runner
*/
