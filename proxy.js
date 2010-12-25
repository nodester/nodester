/*

NodeFu server-side nodejs hosting

This app runs on port 80 and forwards traffic to the appropriate node app 
Checkout https://github.com/nodejitsu/node-http-proxy/blob/master/demo.js for http proxy examples

*/

var http = require('http'),
	url = require('url'),
    httpProxy = require('http-proxy');

// startup app.js API (use Forever in Production)
// var exec = require('child_process').exec;
// exec('forever start app.js');

var spawn = require('child_process').spawn;
var app = spawn('node', ['app.js']);

// startup a couple of apps for testing 
var child1 = spawn('node', ['hello8124.js']);
var child2 = spawn('node', ['hello8125.js']);

httpProxy.createServer(function (req, res, proxy) {
	// TODO: Use subdomains
	if (req.url == '/8124') {
		// http://localhost:8080/8124
    	proxy.proxyRequest(8124, 'localhost');

	} else if (req.url == '/8125') {
		// http://localhost:8080/8125
    	proxy.proxyRequest(8125, 'localhost');
		
	} else {
		proxy.proxyRequest(4000, 'localhost');	  
	}
}).listen(8080); // Use port 80 in production


