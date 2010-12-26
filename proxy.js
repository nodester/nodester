/*

NodeFu server-side nodejs hosting

This app runs on port 80 and forwards traffic to the appropriate node app 
Checkout https://github.com/nodejitsu/node-http-proxy/blob/master/demo.js for http proxy examples

*/

var http = require('http'),
    httpProxy = require('http-proxy'),
	url = require('url'),
	sys = require('sys');

// startup app.js API (use Forever in Production)
// var exec = require('child_process').exec;
// exec('forever start app.js');

var spawn = require('child_process').spawn;
var app = spawn('node', ['app.js']);

// startup a couple of apps for testing 
var child1 = spawn('node', ['hello8124.js']);
var child2 = spawn('node', ['hello8125.js']);

httpProxy.createServer(function (req, res, proxy) {	

	var hostname = req.headers.host;
	var subdomain = hostname.substring(0,hostname.indexOf("."));
	
	sys.puts(JSON.stringify(req.headers));
	// sys.puts(req.headers.auth);
	
	// TODO: Use subdomains
	if (subdomain == 'a') {
		// http://localhost:8080/8124
    	proxy.proxyRequest(8124, 'localhost');

	} else if (subdomain == 'b') {
		// http://localhost:8080/8125
    	proxy.proxyRequest(8125, 'localhost');
		
	} else {
		proxy.proxyRequest(4000, 'localhost');	  
	}
}).listen(8080); // Use port 80 in production


