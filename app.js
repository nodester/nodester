// var forever = require('forever');
// 
// var child = new (forever.Forever)('helloserver.js', {
//   max: 3,
//   silent: true,
//   options: []
// });
// 
// child.on('exit', this.callback);
// child.start();

// var exec = require('child_process').exec;
// exec('forever start /usr/local/src/itemapps/helloserver.js');
// exec('forever start /usr/local/src/itemapps/helloserver2.js');

/* 

NodeFu server-side itemjs hosting 
Written by: @ChrisMatthieu

*/

// var fugue = require('fugue');
var express = require('express');
var url = require('url');
var base64_decode = require('base64').decode;
var app = express.createServer();
var sys = require('sys');

// var sys = require('sys');

// Fake DB items - TODO: Implement CouchDB or Mongo
var users = {
    'chris' : { username: 'chris', password: '123', userid: '1' }
  , 'mark' : { username: 'mark', password: '123', userid: '2' }
  , 'jason' : { username: 'jason', password: '123', userid: '3' }
};

var nodeapps = {
    '1' : { subdomain: 'a', port: '8001' }
  , '2' : { subdomain: 'b', port: '8002' }
  , '3' : { subdomain: 'c', port: '8003' }
};
	
var items = [
    { userid: '1', subdomain: 'a', port: '8001' }
  , { userid: '2', subdomain: 'b', port: '8002' }
  , { userid: '3', subdomain: 'c', port: '8003' }
];	
	
// Routes

app.get('/', function(req, res, next){
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.write('<h1>NodeFu - HiYa! / node.js hosting</h1>');
  res.write('<p>Visit <a href="http://chris:123@api.localhost:8080/status">http://chris:123@api.localhost:8080/status</a></p>');
  res.write('<p>Visit /list/2</p>');
  res.write('<p>Visit /list/2.json</p>');
  res.write('<p>Visit /list/2.xml</p>');
  res.end();
});

app.get('/status', function(req, res, next){
	res.writeHead(200, { 'Content-Type': 'text/html' });

	if(authenticate(req.headers.authorization)){
		res.write('<h1>good auth - now to list apps</h1>');
	} else {
		res.write('<h1>auth failed</h1>');
	};

  res.end();
});

app.get('/list/:id.:format?', function(req, res, next){
	
	// sys.puts(base64_decode(req.headers.authorization.substring(req.headers.authorization.indexOf(" ") + 1 )));
	// sys.puts(req.headers.authorization);
		
  var id = req.params.id
    , format = req.params.format
    , item = items[id];
  // Ensure item exists
  if (item) {
    // Serve the format
    switch (format) {
      case 'json':
        // Detects json
        res.send(item);
        break;
      case 'xml':
        // Set contentType as xml then sends
        // the string
        var xml = ''
          + '<items>'
          + '<item>' + item.subdomain + '</item>'
          + '</items>';
        res.contentType('.xml');
        res.send(xml);
        break;
      case 'html':
      default:
        // By default send some hmtl
        res.send('<h1>' + item.subdomain + '</h1>');
    }
  } else {
			
    // We could simply pass route control and potentially 404
    // by calling next(), or pass an exception like below.
    next(new Error('item ' + id + ' does not exist'));
  }
});

// Middleware

app.use(express.errorHandler({ showStack: true }));

app.listen(4000); 
// fugue.start(app, 4000, null, 1, {verbose : true}); // Start with Fugue

console.log('NodeFu started on port 4000');


function authenticate(basicauth){
	
	var creds = base64_decode(basicauth.substring(basicauth.indexOf(" ") + 1 ));
	var username = creds.substring(0,creds.indexOf(":"));
	var password = creds.substring(creds.indexOf(":")+1);

	var user = users[username];

	if(user.username == username && user.password == password){
		return true;
	} else {
		return false;
	};

};
