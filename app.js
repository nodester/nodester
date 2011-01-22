/* 

Nodester opensource Node.js hosting service

Written by: @ChrisMatthieu & @DanBUK
http://nodester.com

*/

var express = require('express');
var url = require('url');
var base64_decode = require('base64').decode;
var crypto = require('crypto');
var sys = require('sys');
var CouchClient = require('couch-client');
var spawn = require('child_process').spawn;
var exec = require('child_process').exec;
var fs = require('fs');

var config = require("./config");
var couch_loc = "http://" + config.opt.couch_user + ":" + config.opt.couch_pass + "@" + config.opt.couch_host + ":" + config.opt.couch_port + "/" + config.opt.couch_prefix + "_";

var myapp = express.createServer();

myapp.configure(function(){
  myapp.use(express.bodyDecoder());
  myapp.use(express.staticProvider(__dirname + '/public'));
});

// Routes
// Homepage
myapp.get('/', function(req, res, next){
  res.render('index.html');
});

// Status API
// http://localhost:8080/status 
// curl http://localhost:8080/status
myapp.get('/status', function(req, res, next){

  var Nodeport = CouchClient(couch_loc + "nextport");
  Nodeport.get('port', function (err, doc) {
    try {
      var appsrunning = (doc.address - 8000).toString();
     } catch (e) {
       var appsrunning = "0";
     }
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.write('{status : "up", appsrunning : "' +  appsrunning + '"}\n');
    res.end();
  });
});

// New coupon request
// curl -X POST -d "email=dan@nodester.com" http://localhost:8080/coupon
myapp.post('/coupon', function(req, res, next) {

  var email = req.param("email");  
  var Nodefu = CouchClient(couch_loc + "coupons");

  Nodefu.save({_id: email}, function (err, doc) {sys.puts(JSON.stringify(doc));});
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.write('{status : "success - bow to your sensei"}\n');
  res.end();

});


// New user account registration
// curl -X POST -d "user=testuser&password=123&email=chris@nodefu.com&coupon=hiyah" http://localhost:8080/user
// curl -X POST -d "user=me&password=123&coupon=hiyah" http://localhost:8080/user
myapp.post('/user', function(req, res, next){

  var newuser = req.param("user");
  var newpass = req.param("password");
  var email = req.param("email");
  var coupon = req.param("coupon");
  var rsakey = req.param("rsakey");  
  
  if(coupon == config.opt.coupon_code) {

    var Nodefu = CouchClient(couch_loc + "nodefu");

    // Check to see if account exists
    Nodefu.get(newuser, function (err, doc) {
      if (doc){
        // account already registered
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.write('{status : "failure - account exists"}\n');
        res.end();
      } else {
        if (typeof rsakey == 'undefined') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.write('{status : "failure - rsakey is invalid"}\n');
          res.end();
        } else {
          stream = fs.createWriteStream(config.opt.home_dir + '/.ssh/authorized_keys', {
            'flags': 'a+',
            'encoding': 'utf8',
            'mode': 0644
          });

          stream.write('command="/usr/local/bin/git-shell-enforce-directory ' + config.opt.home_dir + '/' + config.opt.hosted_apps_subdir + '/' + newuser + '",no-port-forwarding,no-X11-forwarding,no-agent-forwarding,no-pty ' + rsakey + '\n', 'utf8');
          stream.end();
        
          // Save user information to database and respond to API request
          Nodefu.save({_id: newuser, password: md5(newpass), email: email}, function (err, doc) {sys.puts(JSON.stringify(doc));});
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.write('{status : "success"}\n');
          res.end();
        }
      }
    });

  } else {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.write('{status : "failure - invalid coupon"}\n');
    res.end();
  };

});

// api.localhost requires basic auth to access this section

// Delete your user account 
// curl -X DELETE -u "testuser:123" http://api.localhost:8080/user
myapp.delete('/user', function(req, res, next) {
  var user
  authenticate(req.headers.authorization, res, function(user) {
    if(user){
      // need to delete all users apps
      // and stop all the users apps
      var Nodefu = CouchClient(couch_loc + "nodefu");
      Nodefu.remove(user._id, function (err, doc) {sys.puts(JSON.stringify(doc));});
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.write('{status : "success"}\n');
      res.end();
    };
  });
});

// Create node app 
// curl -X POST -u "testuser:123" -d "appname=test&start=hello.js" http://api.localhost:8080/apps
myapp.post('/app', function(req, res, next) {
  var user
  authenticate(req.headers.authorization, res, function(user) {
    if(user) {
      var appname = req.param("appname");
      var start = req.param("start");
      var Nodeport = CouchClient(couch_loc + "nextport");
      var Nodefu = CouchClient(couch_loc + "apps");

      // Check to see if node app exists
      Nodefu.get(appname, function (err, doc) {
        if (doc){
          // subdomain already exists
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.write('{status : "failure - appname exists"}\n');
          res.end();
        } else {
          // subdomain available - get next available port address
          Nodeport.get('port', function (err, doc) {
            if (typeof doc == 'undefined') {
              var appport = 8000;
            } else {
              var appport = doc.address
            }
            // increment next port address
            Nodeport.save({_id: "port", address: appport + 1}, function (err, doc) {
              // Need error checking here
              var repo_id = doc._rev;
              sys.inspect('repo_id: ' + repo_id);
          
              // Create the app
              Nodefu.save({_id: appname, start: start, port: appport, username: user._id, repo_id: repo_id, running: false, pid: 'unknown' }, function (err, doc) {
                sys.puts(JSON.stringify(doc));
              
                // Setup git repo
                var gitsetup = spawn(config.opt.app_dir + '/scripts/gitreposetup.sh', [config.opt.app_dir, config.opt.home_dir + '/' + config.opt.hosted_apps_subdir, user._id, repo_id, start]);
                // Respond to API request
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.write('{status : "success", port : "' + appport + '", gitrepo : "' + config.opt.git_user + '@' + config.opt.git_dom + ':' + config.opt.hosted_apps_subdir + '/' + doc.username + '/' + doc.repo_id + '.git", start: "' + start + '", running: false, pid: "unknown"}\n');
                res.end();
              });
            });
          });
        };
      });
    };
  });
});

// Update node app
// start=hello.js - To update the initial run script
// running=true - To Start the app
// running=false - To Stop the app
// curl -X PUT -u "testuser:123" -d "appname=test&start=hello.js" http://api.localhost:8080/apps
// curl -X PUT -u "testuser:123" -d "appname=test&running=true" http://api.localhost:8080/apps
myapp.put('/app', function(req, res, next){

  var user
  authenticate(req.headers.authorization, res, function(user){
  
    if(user){
      var appname = req.param("appname");
      var start = req.param("start");
      var running = req.param("running");
      var Nodefu = CouchClient(couch_loc + "apps");

      // Check to see if node app exists
      Nodefu.get(appname, function (err, doc) {
        if (doc){
          // subdomain found
          if (doc.username == user._id) {
            if (running == 'true') {
              // start the app
              if (doc.running == 'true') {
                // Error already running
                res_error(res, 408, "failure - application already running.");
              } else {
                var app_user_home = config.opt.home_dir + '/' + config.opt.hosted_apps_subdir + '/' + doc.username;
                var app_home = app_user_home + '/' + doc.repo_id;
                fs.readFile(config.opt.app_dir + '/app-nodemon-ignore', function (err, data) {
                  if (err) {
                    res_error(res, 500, "failure - couldn't reade app-nodemon-ignore");
                  } else {
                    fs.writeFile(app_home + '/nodemon-ignore', data, function (err) {
                      if (err) {
                        res_error(res, 500, "failure - couldn't write app nodemon-ignore");
                      } else {
                        sys.puts("cmd: " + cmd);
                        // var cmd = config.opt.app_dir + '/deps/nodemon/nodemon ' + app_home + '/.app.pid ' + app_home + '/' + doc.start;
                        var cmd = "sudo " + config.opt.app_dir + '/scripts/launch_app.sh ' + config.opt.app_dir + ' ' + app_user_home + ' ' + app_home + ' ' + doc.start;
                        var child = exec(cmd, function (error, stdout, stderr) {});
                      }
                    });
                  }
                });
              }
            } else if (running == 'false') {
              // stop the app
              if (doc.running == 'false') {
                // Error already running
                res_error(res, 408, "failure - application already stopped.");
              } else {
                // Stop the app
                // PID should be pushed back into CouchDB from nodemon-demon and defo no a sync operation oO
                fs.readFile(config.opt.home_dir + '/' + config.opt.hosted_apps_subdir + '/' + doc.username + '/' + doc.repo_id + '/.app.pid', function (err, data) {
                  if (err) {
                    // No PID?
                  } else {
                    try {
                      process.kill(parseInt(data));
                    } catch (e) {
                      sys.puts(sys.inspect(e));
                    }
                  }
                });
                fs.readFile(config.opt.home_dir + '/' + config.opt.hosted_apps_subdir + '/' + doc.username + '/' + doc.repo_id + '/.app.pid.2', function (err, data) {
                  if (err) {
                    // No PID?
                  } else {
                    try {
                      process.kill(parseInt(data));
                    } catch (e) {
                      sys.puts(sys.inspect(e));
                    }
                  }
                });
 
              }
            } else {
              running = doc.running;
            }
            if (typeof start == 'undefined') {
              start = doc.start;
            }
            // update the app
            Nodefu.save({_id: appname, start: start, port: doc.port, username: user._id, repo_id: doc.repo_id, running: running, pid: 'unknown' }, function (err, doc) {
              sys.puts(JSON.stringify(doc));
              
              // Respond to API request
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.write('{status : "success", port : "' + doc.port + '", gitrepo : "' + config.opt.git_user + '@' + config.opt.git_dom + ':' + config.opt.hosted_apps_subdir + '/' + doc.username + '/' + doc.repo_id + '.git", start: "' + start + '", running: ' + doc.running + ', pid: ' + doc.pid + '}\n');
              res.end();
 
            });
          } else {
            res_error(res, 400, "failure - authentication");
          }
        } else {
          // subdomain not found
          res_error(res, 404, "failure - appname not found");
        };
      });

    };
  
  });
});


// Delete your nodejs app 
// curl -X DELETE -u "testuser:123" -d "appname=test" http://api.localhost:8080/apps
myapp.delete('/app', function(req, res, next){

  var user
  var appname = req.param("appname");
  authenticate(req.headers.authorization, res, function(user){
  
    if(user){
      var Nodefu = CouchClient(couch_loc + "apps");

      // Check if app exists and if user is the owner of the app
      Nodefu.get(appname, function (err, doc) {
        if (doc && doc.username == user._id){
          Nodefu.remove(appname, function (err, doc) {sys.puts(JSON.stringify(doc));});
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.write('{status : "success"}\n');
            res.end();
          
        } else {
          // subdomain doesn't exist or you don't own it
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.write('{status : "failure - bad appname"}\n');
          res.end();
        };
      
      });
      
    };  
  });
});

// Application info
// http://chris:123@api.localhost:8080/app/<appname>
// curl -u "testuser:123" http://api.localhost:8080/app/<appname>
myapp.get('/app/:id', function(req, res, next){

  var user
  authenticate(req.headers.authorization, res, function(user){

    if(user){
      var Nodefu = CouchClient(couch_loc + "apps");
      Nodefu.get(req.params.id, function (err, doc) {
				if (doc && doc.username == user._id){
					res.writeHead(200, { 'Content-Type': 'application/json' });
          res.write('{status : "success", port : "' + doc.port + '", gitrepo : "' + config.opt.git_user + '@' + config.opt.git_dom + ':' + config.opt.hosted_apps_subdir + '/' + doc.username + '/' + doc.repo_id + '.git", start: "' + doc.start + '", running: ' + doc.running + ', pid: ' + doc.pid + '}\n');
				  res.end();
			  } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
					res.write('{status : "failure - appname not found"}');
          res.end();
			  }
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
//   var user
//   authenticate(req.headers.authorization, function(user){
//   
//     if(user){
//       
//       var Nodeport = CouchClient(couch_loc + "nextport");
//       Nodeport.get('port', function (err, doc) {
//         var appsrunning = (doc.address - 8000).toString();
//         
//         res.writeHead(200, { 'Content-Type': 'application/json' });
//         res.write('{status : "up", appsrunning : "' +  appsrunning + '"}');
//           res.end();
//       });
//       
//     } else {
//       // basic auth didn't match account
//       res.writeHead(400, { 'Content-Type': 'application/json' });
//       res.write('{status : "failure - authentication"}');
//         res.end();
//     };
//   });
// });


// myapp.get('/list/:id.:format?', function(req, res, next){
//   
//   // sys.puts(base64_decode(req.headers.authorization.substring(req.headers.authorization.indexOf(" ") + 1 )));
//   // sys.puts(req.headers.authorization);
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
console.log('NodeFu app started on port 4001');

function authenticate(basicauth, res, callback){
  
  var creds = base64_decode(basicauth.substring(basicauth.indexOf(" ") + 1 ));
  var username = creds.substring(0,creds.indexOf(":"));
  var password = creds.substring(creds.indexOf(":")+1);

  var Nodefu = CouchClient(couch_loc + "nodefu");
  Nodefu.get(username, function (err, doc) {
    if(doc && doc._id == username && doc.password == md5(password)){
      callback(doc);
      return;
    };

    // basic auth didn't match account
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.write('{status : "failure - authentication"}\n');
    res.end();
  });
};

var res_error = function (res, code, message) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.write('{status : "' + message + '"}\n');
  res.end();
};



function md5(str) {
  return crypto.createHash('md5').update(str).digest('hex');
}

// process.on('uncaughtException', function (err) {
//    console.log("uncaughtException" + err);
//});
