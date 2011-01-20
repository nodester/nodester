/* 

Nodester opensource Node.js hosting service
Written by: @ChrisMatthieu

http://nodester.com

*/

// var fugue = require('fugue');
var express = require('express');
var url = require('url');
var base64_decode = require('base64').decode;
var crypto = require('crypto');
var myapp = express.createServer();
var sys = require('sys');
var CouchClient = require('couch-client');
var spawn = require('child_process').spawn;
var fs = require('fs');

var request = require('request');
var h = {accept:'application/json', 'content-type':'application/json'};


var valuser


myapp.configure(function(){
	myapp.use(express.bodyDecoder()); // needed to process post data
	myapp.use(express.staticProvider(__dirname + '/public')); // needed to process static pages
});

// Fake DB items - TODO: Implement CouchDB or Mongo
// var items = [
//     { userid: '1', subdomain: 'a', port: '8001' }
//   , { userid: '2', subdomain: 'b', port: '8002' }
//   , { userid: '3', subdomain: 'c', port: '8003' }
// ];	
	
// Routes
// Homepage
myapp.get('/', function(req, res, next){
	res.render('index.html');
});

// New coupon request
// curl -X POST -d "email=chris@nodester.com" http://localhost:8080/coupon
myapp.post('/coupon', function(req, res, next){

	var email = req.param("email");	
	// var Nodefu = CouchClient("http://nodefu:glitter@nodefu.couchone.com:80/coupons");
	// Nodefu.save({_id: email}, function (err, doc) {sys.puts(JSON.stringify(doc));});

	request({uri:'http://nodefu:glitter@nodefu.couchone.com:80/coupons', method:'POST', body: JSON.stringify({_id: email}), headers:h}, function (err, response, body) {
	});	

	res.writeHead(200, { 'Content-Type': 'application/json' });
	res.write('{status : "success - you are now in our queue for an upcoming invite!"}');
	res.end();

});


// New user account registration
// curl -X POST -d "user=testuser&password=123&email=chris@nodester.com&coupon=hiyah" http://localhost:8080/user
// curl -X POST -d "user=me&password=123&coupon=hiyah" http://localhost:8080/user
myapp.post('/user', function(req, res, next){

	var newuser = req.param("user");
	var newpass = req.param("password");
	var email = req.param("email");
	var coupon = req.param("coupon");
	var rsakey = req.param("rsakey");	
	
	if(coupon == 'hiyah') {

		// var Nodefu = CouchClient("http://nodefu:glitter@nodefu.couchone.com:80/nodefu");
	
		// Check to see if account exists
		// Nodefu.get(newuser, function (err, doc) {
		request({uri:'http://nodefu:glitter@nodefu.couchone.com:80/nodefu/' + newuser, method:'GET', headers:h}, function (err, response, body) {
			var myObject = JSON.parse(body);
			if (myObject._id){
				// account already registered
				res.writeHead(400, { 'Content-Type': 'application/json' });
				res.write('{status : "failure - account exists"}');
				res.end();
			} else {
				// Added RSA Key to Authorized_keys for Git access
				// fs.open('~ec2_user/.ssh/authorized_keys', 'a', 666, function( e, id ) {
				//   fs.write( id, rsakey, null, 'utf8', function(){
				//     fs.close(id, function(){
				//       console.log('rsa key written');
				//     });
				//   });
				// });

				stream = fs.createWriteStream('/home/ec2-user/.ssh/authorized_keys', {
			    'flags': 'a+',
			    'encoding': 'utf8',
			    'mode': 0644
				  });

				  stream.write(rsakey, 'utf8');
				  stream.end();
			  
				
				// Save user information to nodefu and respond to API request
				// Nodefu.save({_id: newuser, password: md5(newpass), email: email}, function (err, doc) {sys.puts(JSON.stringify(doc));});
				request({uri:'http://nodefu:glitter@nodefu.couchone.com:80/nodefu', method:'POST', body: JSON.stringify({_id: newuser, password: md5(newpass), email: email}), headers:h}, function (err, response, body) {
				});	
				
				
				res.writeHead(200, { 'Content-Type': 'application/json' });
				res.write('{status : "success"}');
				res.end();
			}
		});

	} else {
		res.writeHead(500, { 'Content-Type': 'application/json' });
		res.write('{status : "failure - invalid coupon"}');
		res.end();
	};

});

// Status API
// http://localhost:8080/status 
// curl http://localhost:8080/status
myapp.get('/status', function(req, res, next){

	// var Nodeport = CouchClient("http://nodefu:glitter@nodefu.couchone.com:80/nextport");
	// Nodeport.get('port', function (err, doc) {
	// 	var appsrunning = (doc.address - 8000).toString();
	// 
	// 	res.writeHead(200, { 'Content-Type': 'application/json' });
	// 	res.write('{status : "up", appsrunning : "' +  appsrunning + '"}');
	//   	res.end();
	// });
	// 
	
	request({uri:'http://nodefu:glitter@nodefu.couchone.com:80/nextport/port', method:'GET', headers:h}, function (err, response, body) {
		if (response){
			var myObject = JSON.parse(body);
			var appsrunning = (myObject.address - 8000).toString();
			res.writeHead(200, { 'Content-Type': 'application/json' });
			res.write('{status : "up", appsrunning : "' +  appsrunning + '"}');
		  	res.end();
		};
	});

});


// api.localhost requires basic auth to access this section

// Delete your user account 
// curl -X DELETE -u "testuser:123" http://api.localhost:8080/user
myapp.delete('/user', function(req, res, next){

	var user
	authenticate(req.headers.authorization, function(user){
	
		if(user){
			// var Nodefu = CouchClient("http://nodefu:glitter@nodefu.couchone.com:80/nodefu");
			// Nodefu.remove(user._id, function (err, doc) {sys.puts(JSON.stringify(doc));});
			request({uri:'http://nodefu:glitter@nodefu.couchone.com:80/nodefu/' + user._id + '?rev=' +  user._rev, method:'DELETE', headers:h}, function (err, response, body) {
			});	

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
myapp.post('/app', function(req, res, next){

	var user
	authenticate(req.headers.authorization, function(user){
	
		if(user){
			var appname = req.param("appname");
			var start = req.param("start");
			var Nodeport = CouchClient("http://nodefu.couchone.com:80/nextport");
			// var Nodefu = CouchClient("http://nodefu:glitter@nodefu.couchone.com:80/apps");


			// Check to see if node app exists
			// Nodefu.get(appname, function (err, doc) {
			request({uri:'http://nodefu:glitter@nodefu.couchone.com:80/apps/' + appname, method:'GET', headers:h}, function (err, response, body) {
				var myObject = JSON.parse(body);
				if (myObject._id){
			
				// if (doc){
					// subdomain already exists
					res.writeHead(400, { 'Content-Type': 'application/json' });
					res.write('{status : "failure - appname exists"}');
					res.end();
				} else {
					// subdomain available - get next available port address
					Nodeport.get('port', function (err, doc) {
					// request({uri:'http://nodefu:glitter@nodefu.couchone.com:80/nextport/port', method:'GET', headers:h}, function (err, response, body) {
					// 	var doc = JSON.parse(body);
					// 	sys.puts(JSON.stringify(doc));
						
						var appport = doc.address;
						// increment next port address
						Nodeport.save({_id: "port", address: appport + 1}, function (err, doc) {sys.puts(JSON.stringify(doc));});
						// request({uri:'http://nodefu:glitter@nodefu.couchone.com:80/nextport/port?rev=' + doc._rev, method:'PUT', body: JSON.stringify({_id: "port", address: appport + 1}), headers:h}, function (err, response, body) {
						// 	sys.puts(response);
						// 	sys.puts(body);
						// });	
					
					
						// Create the app
						// Nodefu.save({_id: appname, start: start, port: appport, username: user._id }, function (err, doc) {
						request({uri:'http://nodefu:glitter@nodefu.couchone.com:80/apps', method:'POST', body: JSON.stringify({_id: appname, start: start, port: appport, username: user._id}), headers:h}, function (err, response, body) {
					
					
							sys.puts(JSON.stringify(doc));
							
							// Setup git repo
							var gitsetup = spawn('./gitreposetup.sh', [doc._rev, start]);
							// var gitsetup = spawn('./gitreposetup.sh', [appname, start]);
							// Respond to API request
							res.writeHead(200, { 'Content-Type': 'application/json' });
							res.write('{status : "success", port : "' + appport + '", gitrepo : "ec2-user@nodester.com:nodester/apps/' + doc._rev + '.git"}');
							// res.write('{status : "success", port : "' + appport + '", gitrepo : "ec2-user@www.nodester.com:nodester/apps/' + appname + '.git"}');
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
myapp.put('/app', function(req, res, next){

	var user
	authenticate(req.headers.authorization, function(user){
	
		if(user){
			var appname = req.param("appname");
			var start = req.param("start");
			// var Nodefu = CouchClient("http://nodefu:glitter@nodefu.couchone.com:80/apps");

			// Check to see if node app exists
			// Nodefu.get(appname, function (err, doc) {
			request({uri:'http://nodefu:glitter@nodefu.couchone.com:80/apps/' + appname, method:'GET', headers:h}, function (err, response, body) {
				var doc = JSON.parse(body);
				if (doc._id){
			
				// if (doc){
					
					// subdomain found 
					// update the app
					// Nodefu.save({start: start, port: doc.port, username: user._id }, function (err, doc) {
					// Nodefu.save({_id: appname, start: start, port: doc.port, username: user._id }, function (err, doc) {
					request({uri:'http://nodefu:glitter@nodefu.couchone.com:80/apps/' + appname + '?rev=' + doc._rev, method:'PUT', body: JSON.stringify({_id: appname, start: start, port: doc.port, username: user._id}), headers:h}, function (err, response, body) {
						
						// sys.puts(JSON.stringify(response));
						sys.puts(response);
						sys.puts(body);
						
						// Setup git repo
						// var gitsetup = spawn('./gitreposetup.sh', [doc._rev]);
						
						// Respond to API request
						res.writeHead(200, { 'Content-Type': 'application/json' });
						// res.write('{status : "success", port : "' + doc.port + '", git : "/usr/local/src/nodester/apps/' + doc._rev + '.git"}');
						res.write('{status : "success", port : "' + doc.port + '", gitrepo : "ec2-user@www.nodester.com:nodester/apps/' + doc._rev + '.git"}');
						// res.write('{status : "success", port : "' + doc.port + '", gitrepo : "ec2-user@www.nodester.com:nodester/apps/' + appname + '.git"}');
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
myapp.delete('/app', function(req, res, next){

	var user
	var appname = req.param("appname");
	authenticate(req.headers.authorization, function(user){
	
		if(user){
			// var Nodefu = CouchClient("http://nodefu:glitter@nodefu.couchone.com:80/apps");

			// Check if app exists and if user is the owner of the app
			// Nodefu.get(appname, function (err, doc) {
			request({uri:'http://nodefu:glitter@nodefu.couchone.com:80/apps/' + appname, method:'GET', headers:h}, function (err, response, body) {
				var doc = JSON.parse(body);
			
				if (doc && doc.username == valuser){
					// Nodefu.remove(appname, function (err, doc) {sys.puts(JSON.stringify(doc));});
					request({uri:'http://nodefu:glitter@nodefu.couchone.com:80/apps/' + appname + '?rev=' +  doc._rev, method:'DELETE', headers:h}, function (err, response, body) {
					});	
				
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

// // Status API
// // http://chris:123@api.localhost:8080/status 
// // curl -u "testuser:123" http://api.localhost:8080/status
// myapp.get('/status', function(req, res, next){
// 
// 	var user
// 	authenticate(req.headers.authorization, function(user){
// 	
// 		if(user){
// 			
// 			var Nodeport = CouchClient("http://nodefu.couchone.com:80/nextport");
// 			Nodeport.get('port', function (err, doc) {
// 				var appsrunning = (doc.address - 8000).toString();
// 				
// 				res.writeHead(200, { 'Content-Type': 'application/json' });
// 				res.write('{status : "up", appsrunning : "' +  appsrunning + '"}');
// 			  	res.end();
// 			});
// 			
// 		} else {
// 			// basic auth didn't match account
// 			res.writeHead(400, { 'Content-Type': 'application/json' });
// 			res.write('{status : "failure - authentication"}');
// 		  	res.end();
// 		};
// 	});
// });


// myapp.get('/list/:id.:format?', function(req, res, next){
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

myapp.use(express.errorHandler({ showStack: true }));

myapp.listen(4001); 
// fugue.start(app, 4001, null, 1, {verbose : true}); // Start with Fugue

console.log('Nodester app started on port 4001');


function authenticate(basicauth, callback){
	
	var creds = base64_decode(basicauth.substring(basicauth.indexOf(" ") + 1 ));
	var username = creds.substring(0,creds.indexOf(":"));
	var password = creds.substring(creds.indexOf(":")+1);

	// var username = "topher"
	// var password = "123"

	// var Nodefu = CouchClient("http://nodefu:glitter@nodefu.couchone.com:80/nodefu");
	// Nodefu.get(username, function (err, doc) {
	request({uri:'http://nodefu:glitter@nodefu.couchone.com:80/nodefu/' + username, method:'GET', headers:h}, function (err, response, body) {
		var doc = JSON.parse(body);
		if (doc._id){

		// if (doc){	
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

process.on('uncaughtException', function (err) {
    console.log(err);
});


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

