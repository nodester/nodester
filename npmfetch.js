// npm install request 
// registry.npmjs.org

var request = require('request'),
    sys = require('sys'),
	spawn = require('child_process').spawn;
	
var exec  = require('child_process').exec;
var open_files_count = 0

request({uri:'http://registry.npmjs.org'}, function (error, response, body) {
  if (!error && response.statusCode == 200) {
	data = JSON.parse(body);

	for (prop in data) {
				
	    sys.puts(prop);
		exec('npm install ' + prop);
		// spawn('npm', ['install', prop]);
		// too many files open
	};
  };
});


function handleError(err) {
	sys.puts('Error!!! encountered ' + err);
	process.exit();
}

function readFiles(files) {
	files.forEach(function(file) {
		var filename = cwd + '/_posts/' + file.toString();
		readFile(filename);
	});
}

function readFile(file) {
	if (open_files_count > 200) {
		global.setTimeout(readFile, 1000, file);
	} else {
		open_files_count++;
		fs.readFile(file, function(err, data) {
			if (err) handleError(err);
			open_files_count--;
      sys.debug(data);
		});
	}
}
