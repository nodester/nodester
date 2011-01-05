/* 

NodeFu opensource Node.js hosting service
Written by: @ChrisMatthieu

http://nodefu.com

*/

// var fugue = require('fugue');
var express = require('express');
var url = require('url');
var base64_decode = require('base64').decode;
var crypto = require('crypto');
var app = express.createServer();
var sys = require('sys');
var CouchClient = require('couch-client');
var spawn = require('child_process').spawn;

var valuser


app.configure(function(){
	app.use(express.bodyDecoder()); // needed to process post data
	app.use(express.staticProvider(__dirname + '/public')); // needed to process static pages
});

// Fake DB items - TODO: Implement CouchDB or Mongo
// var items = [
//     { userid: '1', subdomain: 'a', port: '8001' }
//   , { userid: '2', subdomain: 'b', port: '8002' }
//   , { userid: '3', subdomain: 'c', port: '8003' }
// ];	
	
// Routes
// Homepage
app.get('/', function(req, res, next){
  // res.writeHead(200, { 'Content-Type': 'text/html' });
  // res.write('<h1>NodeFu - HiYa!<br/>Opensource Node.js Hosting services!</h1>');
  // res.write('<p>Visit <a href="http://chris:123@api.localhost:8080/status">http://chris:123@api.localhost:8080/status</a></p>');
  // res.write('<p>Visit /list/2</p>');
  // res.write('<p>Visit /list/2.json</p>');
  // res.write('<p>Visit /list/2.xml</p>');
  // res.end();
res.render('index.html');

});

// New user account registration
// curl -X POST -d "user=testuser&password=123" http://localhost:8080/register
app.post('/register', function(req, res, next){

	var newuser = req.param("user");
	var newpass = req.param("password");

	var Nodefu = CouchClient("http://nodefu.couchone.com:80/nodefu");
	
	// Check to see if account exists
	Nodefu.get(newuser, function (err, doc) {
		if (doc){
			// account already registered
			res.writeHead(400, { 'Content-Type': 'application/json' });
			res.write('{status : "failure - account exists"}');
			res.end();
		} else {
			Nodefu.save({_id: newuser, password: md5(newpass)}, function (err, doc) {sys.puts(JSON.stringify(doc));});
			res.writeHead(200, { 'Content-Type': 'application/json' });
			res.write('{status : "success"}');
			res.end();
		}
	});
});

// api.localhost requires basic auth to access this section

// Delete your user account 
// curl -X DELETE -u "testuser:123" http://api.localhost:8080/destroy
app.delete('/destroy', function(req, res, next){

	var user
	authenticate(req.headers.authorization, function(user){
	
		if(user){
			var Nodefu = CouchClient("http://nodefu.couchone.com:80/nodefu");
			Nodefu.remove(user._id, function (err, doc) {sys.puts(JSON.stringify(doc));});
			res.writeHead(200, { 'Content-Type': 'application/json' });
			res.write('{status : "success"}');
		  	res.end();
		} else {
			// basic auth didn't match account
			res.writeHead(400, { 'Content-Type': 'application/json' });
			res.write('{status : "failure - authentication"}');
		  	res.end();
		};

	
	});
});

// Create node app 
// curl -X POST -u "testuser:123" -d "appname=test&start=hello.js" http://api.localhost:8080/apps
app.post('/apps', function(req, res, next){

	var user
	authenticate(req.headers.authorization, function(user){
	
		if(user){
			var appname = req.param("appname");
			var start = req.param("start");
			var Nodeport = CouchClient("http://nodefu.couchone.com:80/nextport");
			var Nodefu = CouchClient("http://nodefu.couchone.com:80/apps");

			// Check to see if node app exists
			Nodefu.get(appname, function (err, doc) {
				if (doc){
					// subdomain already exists
					res.writeHead(400, { 'Content-Type': 'application/json' });
					res.write('{status : "failure - appname exists"}');
					res.end();
				} else {
					// subdomain available - get next available port address
					Nodeport.get('port', function (err, doc) {
						var appport = doc.address
						// increment next port address
						Nodeport.save({_id: "port", address: appport + 1}, function (err, doc) {sys.puts(JSON.stringify(doc));});
					
						// Create the app
						Nodefu.save({_id: appname, start: start, port: appport, username: user._id }, function (err, doc) {
							sys.puts(JSON.stringify(doc));
							
							// Setup git repo
							var gitsetup = spawn('./gitreposetup.sh', [doc._rev]);
							// Respond to API request
							res.writeHead(200, { 'Content-Type': 'application/json' });
							res.write('{status : "success", port : "' + appport + '", git : "/usr/local/src/nodefu/apps/' + doc._rev + '.git"}');
							res.end();

						});
					
					});
				};
			});

		} else {
			// basic auth didn't match account
			res.writeHead(400, { 'Content-Type': 'application/json' });
			res.write('{status : "failure - authentication"}');
		  	res.end();
		};
	
	});
});

// Update node app 
// curl -X PUT -u "testuser:123" -d "appname=test&start=hello.js" http://api.localhost:8080/apps
app.put('/apps', function(req, res, next){

	var user
	authenticate(req.headers.authorization, function(user){
	
		if(user){
			var appname = req.param("appname");
			var start = req.param("start");
			var Nodefu = CouchClient("http://nodefu.couchone.com:80/apps");

			// Check to see if node app exists
			Nodefu.get(appname, function (err, doc) {
				if (doc){
					
					// subdomain found 
					// update the app
					Nodefu.save({_id: appname, start: start, port: doc.port, username: user._id }, function (err, doc) {
						sys.puts(JSON.stringify(doc));
						
						// Setup git repo
						var gitsetup = spawn('./gitreposetup.sh', [doc._rev]);
						
						// Respond to API request
						res.writeHead(200, { 'Content-Type': 'application/json' });
						res.write('{status : "success", port : "' + doc.port + '", git : "/usr/local/src/nodefu/apps/' + doc._rev + '.git"}');
						res.end();

					});
				
				} else {
					
					// subdomain not found
					res.writeHead(404, { 'Content-Type': 'application/json' });
					res.write('{status : "failure - appname not found"}');
					res.end();
				};
			});

		} else {
			// basic auth didn't match account
			res.writeHead(400, { 'Content-Type': 'application/json' });
			res.write('{status : "failure - authentication"}');
		  	res.end();
		};
	
	});
});

// Delete your nodejs app 
// curl -X DELETE -u "testuser:123" -d "appname=test" http://api.localhost:8080/apps
app.delete('/apps', function(req, res, next){

	var user
	var appname = req.param("appname");
	authenticate(req.headers.authorization, function(user){
	
		if(user){
			var Nodefu = CouchClient("http://nodefu.couchone.com:80/apps");

			// Check if app exists and if user is the owner of the app
			Nodefu.get(appname, function (err, doc) {
				if (doc && doc.username == valuser){
					Nodefu.remove(appname, function (err, doc) {sys.puts(JSON.stringify(doc));});
					res.writeHead(200, { 'Content-Type': 'application/json' });
					res.write('{status : "success"}');
				  	res.end();
					
				} else {
					// subdomain doesn't exist or you don't own it
					res.writeHead(400, { 'Content-Type': 'application/json' });
					res.write('{status : "failure - bad appname"}');
					res.end();
				};
			
			});
			
		} else {
			// basic auth didn't match account
			res.writeHead(400, { 'Content-Type': 'application/json' });
			res.write('{status : "failure - authentication"}');
		  	res.end();
		};

	
	});
});


// Status API
// http://chris:123@api.localhost:8080/status 
// curl -u "testuser:123" http://api.localhost:8080/status
app.get('/status', function(req, res, next){

	var user
	authenticate(req.headers.authorization, function(user){
	
		if(user){
			res.writeHead(200, { 'Content-Type': 'application/json' });
			res.write('{status : "success", user : "' +  user._id + '"}');
		  	res.end();
		} else {
			// basic auth didn't match account
			res.writeHead(400, { 'Content-Type': 'application/json' });
			res.write('{status : "failure"}');
		  	res.end();
		};
	});
});

// app.get('/list/:id.:format?', function(req, res, next){
// 	
// 	// sys.puts(base64_decode(req.headers.authorization.substring(req.headers.authorization.indexOf(" ") + 1 )));
// 	// sys.puts(req.headers.authorization);
// 		
//   var id = req.params.id
//     , format = req.params.format
//     , item = items[id];
//   // Ensure item exists
//   if (item) {
//     // Serve the format
//     switch (format) {
//       case 'json':
//         // Detects json
//         res.send(item);
//         break;
//       case 'xml':
//         // Set contentType as xml then sends
//         // the string
//         var xml = ''
//           + '<items>'
//           + '<item>' + item.subdomain + '</item>'
//           + '</items>';
//         res.contentType('.xml');
//         res.send(xml);
//         break;
//       case 'html':
//       default:
//         // By default send some hmtl
//         res.send('<h1>' + item.subdomain + '</h1>');
//     }
//   } else {
// 			
//     // We could simply pass route control and potentially 404
//     // by calling next(), or pass an exception like below.
//     next(new Error('item ' + id + ' does not exist'));
//   }
// });

// Middleware

app.use(express.errorHandler({ showStack: true }));

app.listen(4000); 
// fugue.start(app, 4000, null, 1, {verbose : true}); // Start with Fugue

console.log('NodeFu app started on port 4000');


function authenticate(basicauth, callback){
	
	var creds = base64_decode(basicauth.substring(basicauth.indexOf(" ") + 1 ));
	var username = creds.substring(0,creds.indexOf(":"));
	var password = creds.substring(creds.indexOf(":")+1);

	// var username = "topher"
	// var password = "123"

	var Nodefu = CouchClient("http://nodefu.couchone.com:80/nodefu");
	Nodefu.get(username, function (err, doc) {

		if (doc){	
			if(doc._id == username && doc.password == md5(password)){
				valuser = username;
				// return true;
				callback(doc);
				return;
			} else {
				// return false;
				callback(null);
				return;
			};
		} else {
			callback(null);
			return;
		};
	
	});

};

function md5(str) {
  return crypto.createHash('md5').update(str).digest('hex');
}


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

