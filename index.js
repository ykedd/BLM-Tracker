const express = require("express");
const path = require("path");
const fs = require('fs');
const copydir = require('copy-dir');
const del = require('del');
const glob = require('glob');
const app = express();
const ejs = require('ejs');
const moment = require('moment');
const cron = require("node-cron");
// const kv = require('./local_modules/cloudflare-workers-kv');
const chokidar = require('chokidar');
const fetch = require('node-fetch');
const async = require('async');
const col = require('chalk');
const figlet = require('figlet');
var protests = require('./protests.js').protests;
// const env = require('./env.json'); // Don't edit this without talking to DCON it could break things in production

protests.pages = {
	display_name:'Pages',
	pre_region_type:'page',
	locations:{
	    home:{display_name:'Home',path:'',template:'index.ejs'},
	    safety:{display_name:'Safety',path:'safety',template:'safety.ejs'},
	    petitions:{display_name:'Petitions',path:'petitions',template:'petitions.ejs'},
	    education:{display_name:'Education',path:'education',template:'education.ejs'},
	    team:{display_name:'Team',path:'team',template:'team.ejs'},
	}
};

var args = process.argv.splice(2);
var task = args[0];

(async () => {
	await new Promise(cb => {
		figlet('2020protests',(err, data) => {
			console.log(data);
			console.log('Avi Schiffmann - Daniel Conlon - And others\n');
			cb();
		});
	});

	var build_pages = function() {
		return new Promise(async (resolve,reject) => {
			console.log(col.red('Deleting: dist/**'));
		    const deletedPaths = await del(['dist']); // DELETE EVERYTHING INSIDE OF THE DIST FOLDER DON'T PLAY AROUND WITH THIS IT CAN WIPE YOUR OS!!

		    if (!fs.existsSync('dist/')) {
		        fs.mkdirSync('dist');
		        fs.mkdirSync('dist/assets');
		    }

		    var files = glob.sync('src/*');
		    files.forEach((v) => {
		    	var finalDir = v.split('/');
		    	finalDir.shift();
		    	finalDir = finalDir.join('/');

		    	var dirs = finalDir.split('/');
				var dirstr = '';

				for(var i in dirs){
					dirstr += dirs[i]+'/';
					if(!fs.existsSync('dist/assets/'+dirstr)){
					    fs.mkdirSync('dist/assets/'+dirstr);
					}
				}

				console.log(col.green(`Copying`),col.yellowBright(v));
		    	copydir.sync(v,'dist/assets/'+finalDir);
		    });

		    for(var i in protests){
		    	var region = protests[i];

		    	for(var o in region.locations){
		    		var loc = region.locations[o];

		    		var path = (loc.path != null?loc.path:region.country_code+'/'+o)

			        var dirs = path.split('/');
					var dirstr = '';

					for(var i in dirs){
						dirstr += dirs[i]+'/';
						if(dirstr && !fs.existsSync('dist/'+dirstr)){
						    fs.mkdirSync('dist/'+dirstr);
						}
					}

					((path,loc)=>{
						console.log(col.green("Building page:"),col.yellowBright('/'+path));
					    var str = ejs.renderFile('./src/templates/'+loc.template,{
					    	data: {
					    		protests,
						        ...loc
						    }
					    },function(err,str){
					    	if(err){
					    		error = err;
					    		console.log(col.bgRed('Fatal Error'));
					    		console.log(col.red(err));
					    	}
					    	fs.writeFileSync('dist/'+path+'/index.html',str);
					    	if(loc.legacy)fs.writeFileSync('dist/'+loc.legacy,str);
					    });
					})(path,loc);
		    	};
		    };

			// var error = '';
			// protests.forEach(async (v, i) => {
			// 	if(error)return;

			//     console.log(col.green("Building page:"),col.yellowBright('/'+v.path));
			//     var str = ejs.renderFile(v.data,{
			//     	data: {
			// 	    	...protests,
			// 	        page:v
			// 	    }
			//     },function(err,str){
			//     	if(err){
			//     		error = err;
			//     		console.log(col.bgRed('Fatal Error'));
			//     		console.log(col.red(err));
			//     	}
			//     	fs.writeFileSync('dist/'+v.path+'/index.html',str);
			//     });
			// });

			resolve();
		});
	};

	build_pages();
	const watcher = chokidar.watch(glob.sync('src/**')).on('change',path => {
		build_pages();
	});

	app.use('/', express.static(path.join(__dirname, 'dist')));

	app.listen(process.env.PORT || 3000);
	console.log(col.bgCyan("Listening on port: " + 3000));
	console.log("Ready for changes");

})();