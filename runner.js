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
	const new_part = function(params) {
		if(!params.new_part) params.new_part={};
		if(!params.new_part.name){
			if(params.argv.length){
				if (fs.existsSync(process.cwd()+'/server/'+params.argv[0].toLowerCase())) {
					console.log('This part already exists in current project');
					process.exit(0);
				}else{
					params.new_part.name = params.argv[0];
				}
			}else{
				return readline.question('Provide name for the part you want to create: ', function(answer){
					if(answer){
						if (fs.existsSync(process.cwd()+'/'+answer.toLowerCase())) {
							console.log('This part already exists in current project');
						}else{
							params.new_part.name = answer;
						}
					}else{
						console.log('Please type your project name');
					}
					new_part(params);
				});
			}
		}
		let folder = process.cwd()+'/server/'+params.new_part.name.toLowerCase();
		fs.mkdirSync(folder, { recursive: true });
		// index.js
		fs.writeFileSync(folder+'/index.js', `module.exports = function(waw) {\n\t// add your router code\n};`, 'utf8');
		// part.json
		data = fs.readFileSync(__dirname+'/part/part.json', 'utf8');
		data = rpl(data, 'CNAME', cname(params.new_part.name));
		data = rpl(data, 'NAME', params.new_part.name.toLowerCase());
		fs.writeFileSync(folder+'/part.json', data, 'utf8');
		// schema.js
		data = fs.readFileSync(__dirname+'/part/schema.js', 'utf8');
		data = rpl(data, 'CNAME', cname(params.new_part.name));
		data = rpl(data, 'NAME', params.new_part.name.toLowerCase());
		fs.writeFileSync(folder+'/schema.js', data, 'utf8');
		console.log('Part has been created');
		process.exit(1);
	};
	module.exports.add = new_part;
	module.exports.a = new_part;
/*
*	End of runner
*/