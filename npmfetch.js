// npm install request 
// registry.npmjs.org

var request = require('request'),
    sys = require('sys'),
	spawn = require('child_process').spawn;
	
var exec  = require('child_process').exec;

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
