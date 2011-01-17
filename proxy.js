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
// var app = spawn('node', ['app.js']);

// var forever = require('forever');

var Nodefu = CouchClient("http://nodefu.couchone.com:80/apps");

// Launch all nodefu hosted apps
// spawn('ruby', ['launchapps.rb']);

// NODEJS ISSUE WITH TOO MANY OPEN FILES
// Nodefu.view('/apps/_design/nodeapps/_view/all', {}, function(err, doc) {
// 	for (var key in doc.rows) {
// 	   	var obj = doc.rows[key];
// 		sys.puts('launching: subdomain ' + obj["value"]["_id"] + ' on port ' + obj["value"]['port']);
// 		process.chdir('apps/' + obj["value"]['_rev']);
// 		spawn('node', [obj["value"]['start']]);
// 
// 		// var child = new (forever.Forever)(obj["value"]['start'], {
// 		//   silent: true,
// 		//   options: []
// 		// });
// 		// child.start();
// 
// 		process.chdir('../..');
// 
// 	}
// 		
// });


httpProxy.createServer(function (req, res, proxy) {	
	
	var hostname = req.headers.host;
	var subdomain = hostname.substring(0,hostname.indexOf("."));
	
	// Show headers for testing
	sys.puts(JSON.stringify(req.headers));	
	
	if (subdomain == ''){
		res.writeHead(302, {
		  'Location': 'http://www.nodefu.com' + req.url });
		res.end();
	} else if (subdomain == 'api') {
		// if (req.url != '/user' && req.method != 'POST') {
			// Check for basic auth on API
			// send browser request for user credentials
			if(req.headers.authorization==undefined) {
			  	res.writeHead(401, {'Content-Type': 'text/plain', 'WWW-Authenticate': 'Basic'});
				res.end('password?\n');
			} else {
				// Redirect to Nodefu's home page if no credentials are provided
			  	proxy.proxyRequest(4001, 'localhost');
			};
		// };
		
	} else if (subdomain != 'www' && subdomain != 'api') {
		// 	redirect to subdomain's port by looking up subdomain and port in couchdb
		Nodefu.get(subdomain, function (err, doc) {
			if (doc){
				proxy.proxyRequest(doc.port, 'localhost');
			}
		});
		
	} else {
		// redirect to Nodefu's home page
		proxy.proxyRequest(4001, 'localhost');	  
	};
	
}).listen(80); // Use port 80 in production
sys.puts('NodeFu started on port 80');

process.on('uncaughtException', function (err) {
    console.log(err);
});





