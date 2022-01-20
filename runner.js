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
	const generate_local = function(params) {
		if (Object.keys(list) > 1 && !params.local_module) {
			let text = 'Which module you want to start with?', counter=0, modules={};
			for(let key in list){
				modules[++counter] = list[key];
				text += '\n'+key;
			}
			text += '\nChoose number: ';
			return readline.question(text, function(answer){
				if(answer && modules[parseInt(answer)]){
					params.local_module = modules[parseInt(answer)];
				}
				generate_local(params);
			});
		}
		if (!params.local_module) {
			params.local_module = 'default';
		}
		let data;
		fs.mkdirSync(params.folder, { recursive: true });
		// index.js
		data = fs.readFileSync(__dirname+'/modules/'+params.local_module+'/index.js', 'utf8');
		data = rpl(data, 'CNAME', cname(params.new_part.name));
		data = rpl(data, 'NAME', params.new_part.name.toLowerCase());
		fs.writeFileSync(params.folder+'/index.js', data, 'utf8');
		// module.json
		data = fs.readFileSync(__dirname+'/modules/'+params.local_module+'/module.json', 'utf8');
		data = rpl(data, 'CNAME', cname(params.new_part.name));
		data = rpl(data, 'NAME', params.new_part.name.toLowerCase());
		fs.writeFileSync(params.folder+'/module.json', data, 'utf8');
		// schema.js1
		data = fs.readFileSync(__dirname+'/modules/'+params.local_module+'/schema.js', 'utf8');
		data = rpl(data, 'CNAME', cname(params.new_part.name));
		data = rpl(data, 'NAME', params.new_part.name.toLowerCase());
		fs.writeFileSync(params.folder+'/schema.js', data, 'utf8');
		console.log('Module has been created');
		process.exit(1);
	}
	const new_part = function(params) {
		if (!fs.existsSync(process.cwd()+'/config.json')) {
			console.log('You are located not in waw project');
			process.exit(0);
		}
		if(!params.new_part) params.new_part={};
		if(!params.new_part.name){
			if(params.argv.length){
				if (fs.existsSync(process.cwd()+'/server/'+params.argv[0].toLowerCase())) {
					console.log('This module already exists in current project');
					process.exit(0);
				}else{
					params.new_part.name = params.argv[0];
				}
			}else{
				return readline.question('Provide name for the module you want to create: ', function(answer){
					if(answer){
						if (fs.existsSync(process.cwd()+'/'+answer.toLowerCase())) {
							console.log('This module already exists in current project');
						}else{
							params.new_part.name = answer;
						}
					}else{
						console.log('Please type your module name');
					}
					new_part(params);
				});
			}
		}
		params.folder = process.cwd()+'/server/'+params.new_part.name.toLowerCase();
		if(params.argv.length > 1){
			fs.mkdirSync(params.folder, { recursive: true });
			let repo = params.git(params.folder);
			repo.init(function(){
				repo.addRemote('origin', params.argv[1], function(err){
					repo.fetch('--all', function(err){
						let branch = 'master';
						if(params.argv.length>2){
							branch = params.argv[2];
						}
						repo.reset('origin/'+branch, err=>{
							console.log('Module has been created');
							process.exit(1);
						});
					});
				});
			});
		}else generate_local(params);
	};
	module.exports.add = new_part;
	module.exports.a = new_part;
/*
*	End of runner
*/
