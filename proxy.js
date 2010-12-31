/*

NodeFu - Nodejs hosting
This app runs on port 80 and forwards traffic to the appropriate node app 

*/

// Fake DB items - TODO: Implement CouchDB or Mongo
var nodeapps = {
    'a' : { appname: 'hello8124.js', port: '8124', userid: '1'  }
  , 'b' : { appname: 'hello8125.js', port: '8125', userid: '2'  }
  , 'c' : { appname: 'hello8126.js', port: '8126', userid: '3'  }
};

var httpProxy = require('http-proxy'),
	url = require('url'),
	sys = require('sys');

// startup app.js API (use Forever in Production)
// var exec = require('child_process').exec;
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
for (var key in nodeapps) {
   	var obj = nodeapps[key];
	sys.puts('launching: subdomain ' + key + ' on port ' + obj['port']);
	spawn('node', [obj['appname']]);
}


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
		
	} else if (nodeapps[subdomain]) {
		// 	redirect to subdomain's port
		proxy.proxyRequest(nodeapps[subdomain]['port'], 'localhost');
	
		
	} else {
		// redirect to Nodefu's home page
		proxy.proxyRequest(4000, 'localhost');	  
	}
}).listen(8080); // Use port 80 in production
console.log('NodeFu started on port 8080');






