/*

NodeFu - Nodejs hosting
This app runs on port 80 and forwards traffic to the appropriate node app 

*/

var httpProxy = require('http-proxy'),
	url = require('url'),
	sys = require('sys');

var CouchClient = require('couch-client');
// var nodemon = require('nodemon');

// startup app.js API (use Forever in Production)
var exec = require('child_process').exec;
// exec('forever start app.js');

var spawn = require('child_process').spawn;
var app = spawn('node', ['app.js']);

// startup a couple of apps for testing 
// var child1 = spawn('node', ['hello8124.js']);
// var child2 = spawn('node', ['hello8125.js']);

// var forever = require('forever');
// var child = new (forever.Forever)('hello8124.js', {
//   silent: true,
//   options: []
// });
// // child.on('exit', this.callback);
// child.start();

// Launch all nodefu hosted apps
var Nodefu = CouchClient("http://nodefu.couchone.com:80/apps");
Nodefu.view('/apps/_design/nodeapps/_view/all', {}, function(err, doc) {
	// sys.puts(JSON.stringify(doc.rows[0].id))
	
	for (var key in doc.rows) {
	   	var obj = doc.rows[key];
		sys.puts('launching: subdomain ' + obj["value"]["_id"] + ' on port ' + obj["value"]['port']);
		process.chdir('apps/' + obj["value"]['_rev']);
		spawn('node', [obj["value"]['start']]);
		process.chdir('../..');
		// spawn('cd apps/' + obj["value"]["_rev"] + ' | node', [obj["value"]['_rev'] + '/' + [obj["value"]['start']]);
		// exec('cd apps/' + obj["value"]["_rev"] + ' | node ' + obj["value"]["start"]);
	}
		
});

httpProxy.createServer(function (req, res, proxy) {	

	var hostname = req.headers.host;
	var subdomain = hostname.substring(0,hostname.indexOf("."));
	
	// Show headers for testing
	sys.puts(JSON.stringify(req.headers));
	
	if (subdomain == 'api') {
		
		// Check for basic auth on API
		// send browser request for user credentials
		if(req.headers.authorization==undefined) {
		  	res.writeHead(401, {'Content-Type': 'text/plain', 'WWW-Authenticate': 'Basic'});
			res.end('password?\n');
		} else {
			// Redirect to Nodefu's home page if no credentials are provided
		  	proxy.proxyRequest(4000, 'localhost');
		};
		
	} else if (subdomain) {
		// 	redirect to subdomain's port by looking up subdomain and port in couchdb
		Nodefu.get(subdomain, function (err, doc) {
			if (doc){
				proxy.proxyRequest(doc.port, 'localhost');
			}
		});
		
	} else {
		// redirect to Nodefu's home page
		proxy.proxyRequest(4000, 'localhost');	  
	}
}).listen(8080); // Use port 80 in production
sys.puts('NodeFu started on port 8080');






