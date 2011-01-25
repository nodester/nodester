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
var spawn = require('child_process').spawn;
var exec = require('child_process').exec;
var fs = require('fs');
var npmwrapper = require('npm-wrapper').npmwrapper;

var request = require('request');
var h = {accept: 'application/json', 'content-type': 'application/json'};

var config = require("./config");
var couch_loc = "http://" + config.opt.couch_user + ":" + config.opt.couch_pass + "@" + config.opt.couch_host + ":" + config.opt.couch_port + "/";
if (config.opt.couch_prefix.length > 0) {
  couch_loc += config.opt.couch_prefix + "_";
}

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

  request({uri:couch_loc + 'nextport/port', method:'GET', headers:h}, function (err, response, body) {
    var doc = JSON.parse(body);
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
  request({uri:couch_loc + "coupons", method:'POST', body: JSON.stringify({_id: email}), headers:h}, function (err, response, body) {
  });

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.write('{status : "success - you are now in queue to receive an invite on our next batch!"}\n');
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

    request({uri:couch_loc + 'nodefu/' + newuser, method:'GET', headers:h}, function (err, response, body) {
      var doc = JSON.parse(body);
      if (doc._id){
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
          request({uri: couch_loc + 'nodefu', method:'POST', body: JSON.stringify({_id: newuser, password: md5(newpass), email: email}), headers: h}, function (err, response, body) {
          });

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

      request({uri:couch_loc + 'nodefu/' + user._id + '?rev=' +  user._rev, method:'DELETE', headers:h}, function (err, response, body) {
      });

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
      request({uri:couch_loc + 'apps/' + appname, method:'GET', headers:h}, function (err, response, body) {
        var myObject = JSON.parse(body);
        if (myObject._id){
          // subdomain already exists
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.write('{status : "failure - appname exists"}\n');
          res.end();
        } else {
          // subdomain available - get next available port address
          request({uri:couch_loc + 'nextport/port', method:'GET', headers:h}, function (err, response, body) {
            var doc = JSON.parse(body);
            if (typeof doc.error != 'undefined' && doc.error == 'not_found') {
              var appport = 8000;
            } else {
              var appport = doc.address
            }
            var repo_id = doc._rev;
            // increment next port address
            request({uri:couch_loc + 'nextport/port', method:'PUT', body: JSON.stringify({_id: "port", address: appport + 1, _rev: doc._rev}), headers:h}, function (err, response, body) {
              var doc = JSON.parse(body);
              // Create the app
              request({uri:couch_loc + 'apps', method:'POST', body: JSON.stringify({_id: appname, start: start, port: appport, username: user._id, repo_id: repo_id, running: false, pid: 'unknown' }), headers:h}, function (err, response, body) {
                var doc = JSON.parse(body);
                request({uri:couch_loc + 'repos', method:'PUT', body: JSON.stringify({_id: repo_id, appname: appname, username: user._id}), headers:h}, function (err, response, body) {
                  // TODO - Error handling...
                });
                // Setup git repo
                var gitsetup = spawn(config.opt.app_dir + '/scripts/gitreposetup.sh', [config.opt.app_dir, config.opt.home_dir + '/' + config.opt.hosted_apps_subdir, user._id, repo_id, start]);
                // Respond to API request
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.write('{status : "success", port : "' + appport + '", gitrepo : "' + config.opt.git_user + '@' + config.opt.git_dom + ':' + config.opt.home_dir + config.opt.hosted_apps_subdir + '/' + user._id  + '/' + repo_id + '.git", start: "' + start + '", running: false, pid: "unknown"}\n');
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
// curl -X PUT -u "testuser:123" -d "appname=test&running=false" http://api.localhost:8080/apps
// curl -X PUT -u "testuser:123" -d "appname=test&running=restart" http://api.localhost:8080/apps
myapp.put('/app', function(req, res, next){
  var appname = req.param("appname");
  authenticate_app(req.headers.authorization, appname, res, function (user, app) {
    var start = req.param("start");
    var running = req.param("running");
    var app_user_home = config.opt.home_dir + '/' + config.opt.hosted_apps_subdir + '/' + app.username;
    var app_home = app_user_home + '/' + app.repo_id;
    if (running == 'true') {
      // start the app
      if (app.running == 'true') {
        // Error already running
        res_error(res, 408, "failure - application already running.");
      } else {
        app_start(app.repo_id, function (rv) {
          if (rv == false) {
            running = 'error-starting';
          } else {
            running = 'true';
          }
        });
      }
    } else if (running == 'false' || running == 'restart') {
      cmd = "stopping...";
      // stop the app
      if (running == 'false' && app.running == 'false') {
        // Error already stopped
        res_error(res, 408, "failure - application already stopped.");
      } else {
        // Stop or restart the app
        app_stop(app.repo_id, function (rv) {
          if (rv == false) {
            running = 'error-stopping';
          } else {
            if (running == 'restart') {
              app_start(app.repo_id, function (rv) {
                if (rv == false) {
                  running = 'error-restarting';
                } else {
                  running = 'true';
                }
              });
            }
          }
        });
      }
    } else {
      cmd = "blank";
      running = app.running;
    }
    if (typeof start == 'undefined') {
      start = app.start;
    }
    // update the app
    request({uri:couch_loc + 'apps/' + appname, method:'PUT', body: JSON.stringify({_id: appname, _rev: app._rev, start: start, port: app.port, username: user._id, repo_id: app.repo_id, running: running, pid: 'unknown' }), headers: h}, function (err, response, body) {
      // Respond to API request
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.write('{status : "success", port : "' + app.port + '", gitrepo : "' + config.opt.git_user + '@' + config.opt.git_dom + ':' + config.opt.home_dir + config.opt.hosted_apps_subdir + '/' + app.username + '/' + app.repo_id + '.git", start: "' + start + '", running: ' + running + ', pid: ' + app.pid + '}\n');
      res.end();
    });
  });
});

var app_stop = function (repo_id, callback) {
  request({uri:couch_loc + 'repos/' + repo_id, method:'GET', headers:h}, function (err, response, body) {
    var doc = JSON.parse(body);
    if (typeof doc.error != 'undefined' && doc.error == 'not_found') {
      callback(false);
    } else {
      var app_home = config.opt.home_dir + '/' + config.opt.hosted_apps_subdir + '/' + doc.username + '/' + doc.repo_id;
      fs.readFile(app_home + '/.app.pid', function (err, data) {
        if (err) {
          callback(false);
        } else {
          try {
            process.kill(parseInt(data));
            callback(true);
          } catch (e) {
            callback(false);
          }
        }
      });
    }
  });
};

var app_start = function (repo_id, callback) {
  request({uri:couch_loc + 'repos/' + repo_id, method:'GET', headers:h}, function (err, response, body) {
    var doc = JSON.parse(body);
    if (typeof doc.error != 'undefined' && doc.error == 'not_found') {
      callback(false);
    } else {
      var user_home = config.opt.home_dir + '/' + config.opt.hosted_apps_subdir + '/' + doc.username;
      var app_home = app_home + '/' + doc.repo_id;
      request({ method: 'GET', uri: couch_loc + 'apps/' + appname, headers: h}, function (err, response, body) {
        var app = JSON.parse(body);
        if (typeof app.error != 'undefined' && app.error == 'not_found') {
          callback(false);
        } else {
          var cmd = "sudo " + config.opt.app_dir + '/scripts/launch_app.sh ' + config.opt.app_dir + ' ' + user_home + ' ' + app.repo_id + ' ' + app.start;
          var child = exec(cmd, function (error, stdout, stderr) {});
        }
      });
    }
  });
};

var app_restart = function (repo_id, callback, skip_stop_check) {
  app_stop(repo_id, function (rv) {
    if (rv == false && skip_stop_check != true) {
      callback(false);
    } else {
      app_start(repo_id, function (rv) {
        if (rv == false) {
          callback(false);
        } else {
          callback(true);
        }
      });
    }
  });
};

// App backend restart handler
// 
myapp.get('/app_restart', function(req, res, next) {
  var repo_id = req.param("repo_id");
  var restart_key = req.param("restart_key");
  if (restart_key != config.opt.restart_key) {
    res.writeHead(403, {'Content-Type': 'text/plain'});
    res.end();
  }
  app_restart(repo_id, function(rv) {
    if (rv == false) {
      res.writeHead(200, {'Content-Type': 'text/plain'});
      res.end('{"status": "failed to restart"}\n');
    } else {
      res.writeHead(200, {'Content-Type': 'text/plain'});
      res.end('{"status": "restarted"}\n');
    }
  }, true);
});


// Delete your nodejs app 
// curl -X DELETE -u "testuser:123" -d "appname=test" http://api.localhost:8080/apps
myapp.delete('/app', function(req, res, next){
  var appname = req.param("appname");
  authenticate_app(req.headers.authorization, appname, res, function (user, app) {
    request({uri: couch_loc + 'apps/' + appname + '?rev=' + app._rev, method:'DELETE', headers: h}, function (err, response, body) {
      // Error checking oO
    });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.write('{status : "success"}\n');
    res.end();
  });
});

// Application info
// http://chris:123@api.localhost:8080/app/<appname>
// curl -u "testuser:123" http://api.localhost:8080/app/<appname>
myapp.get('/app/:appname', function(req, res, next){
  var appname = req.param("appname");
  authenticate_app(req.headers.authorization, appname, res, function (user, app) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.write('{status : "success", port : "' + app.port + '", gitrepo : "' + config.opt.git_user + '@' + config.opt.git_dom + ':' + config.opt.home_dir + config.opt.hosted_apps_subdir + '/' + app.username + '/' + app.repo_id + '.git", start: "' + app.start + '", running: ' + app.running + ', pid: ' + app.pid + '}\n');
    res.end();
  });
});

// APP NPM Handlers
// http://user:pass@api.localhost:8080/npm

myapp.post('/test', function(req, res, next) {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('test\n');
});

myapp.post('/appnpm', function(req, res, next) {
  var appname = req.param("appname");
  var action = req.param("action");
  var package = req.param("package");
  authenticate_app(req.headers.authorization, appname, res, function (user, app) {
    var good_action = true;
    switch (action) {
      case "install":
        break;
      case "update":
        break;
      case "uninstall":
        break;
      default:
        good_action = false;
        break;
    }

    if(good_action === true) {
      var app_user_home = config.opt.home_dir + '/' + config.opt.hosted_apps_subdir + '/' + user._id + '/' + app.repo_id;
      var n = new npmwrapper();
      n.setup(app_user_home + '/.node_libraries', app_user_home + '/.npm_bin', app_user_home + '/.npm_man', action, package);
      n.run(function (output) {
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.write(JSON.stringify({status: 'finished', output: output}) + '\n');
        res.end();
      });
    } else {
      res.writeHead(400, {'Content-Type': 'application/json'});
      res.write('{"status": "failure - invalid action parameter"}\n');
      res.end();
    }
  });
});

var authenticate_app = function (auth_infos, appname, res, callback) {
  authenticate(auth_infos, res, function(user) {
    if (typeof user != 'undefined') {
      request({ method: 'GET', uri: couch_loc + 'apps/' + appname, headers: h}, function (err, response, body) {
        var doc = JSON.parse(body);
        if (doc && doc.username == user._id) {
          callback(user, doc);
        } else {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end('{status : "failure - app not found"}\n');
        }
      });
    } else {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end('{status : "failure - authentication"}\n');
    }
  });
};

myapp.use(express.errorHandler({ showStack: true }));
myapp.listen(4001); 
console.log('Nodester app started on port 4001');

function authenticate(basicauth, res, callback) {
  var creds = base64_decode(basicauth.substring(basicauth.indexOf(" ") + 1 ));
  var username = creds.substring(0,creds.indexOf(":"));
  var password = creds.substring(creds.indexOf(":")+1);

  request({uri:couch_loc + 'nodefu/' + username, method:'GET', headers:h}, function (err, response, body) {
    var doc = JSON.parse(body);

    if(doc && doc._id == username && doc.password == md5(password)){
      callback(doc);
    } else {
      // basic auth didn't match account
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.write('{status : "failure - authentication"}\n');
      res.end();
    }
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

process.on('uncaughtException', function (err) {
   console.log("uncaughtException" + err);
});
