/* 

Nodester opensource Node.js hosting service

Written by: @ChrisMatthieu & @DanBUK
http://nodester.com

*/

var express = require('express'),
    url = require('url'),
    crypto = require('crypto'),
    sys = require('sys'),
    spawn = require('child_process').spawn,
    exec = require('child_process').exec,
    fs = require('fs'),
    npmwrapper = require('npm-wrapper').npmwrapper,
    request = require('request'),
    lib = require("./lib"),
    config = require("./lib/config"),
    middle = require('./lib/middle');

/*
process.on('uncaughtException', function (err) {
   console.log("uncaughtException" + sys.inspect(err));
});
*/

var myapp = express.createServer();

myapp.configure(function(){
  myapp.use(express.bodyDecoder());
  myapp.use(express.staticProvider(__dirname + '/public'));
  myapp.use(middle.error());
});

// Routes


// Homepage
myapp.get('/', function(req, res, next){
  res.render('index.html');
});

// Status API
// http://localhost:8080/status 
// curl http://localhost:8080/status
var status = require('./lib/status');
myapp.get('/status', status.get);

// New coupon request
// curl -X POST -d "email=dan@nodester.com" http://localhost:8080/coupon
var coupon = require('./lib/coupon');
myapp.post('/coupon', coupon.post);

// curl http://localhost:8080/unsent
myapp.get('/unsent', coupon.unsent);


// New user account registration
// curl -X POST -d "user=testuser&password=123&email=chris@nodefu.com&coupon=hiyah" http://localhost:8080/user
// curl -X POST -d "user=me&password=123&coupon=hiyah" http://localhost:8080/user
var user = require('./lib/user');
myapp.post('/user', user.post);

// api.localhost requires basic auth to access this section
// Edit your user account 
// curl -X PUT -u "testuser:123" -d "password=test&rsakey=1234567" http://api.localhost:8080/user
myapp.put('/user', middle.authenticate, user.put);

// Delete your user account 
// curl -X DELETE -u "testuser:123" http://api.localhost:8080/user
myapp.delete('/user', middle.authenticate, user.delete);

// All Applications info
// http://chris:123@api.localhost:8080/apps
// curl -u "testuser:123" http://api.localhost:8080/apps
var apps = require('./lib/apps');
myapp.get('/apps', middle.authenticate, apps.get);


var app = require('./lib/app');
// Application info
// http://chris:123@api.localhost:8080/app/<appname>
// curl -u "testuser:123" http://api.localhost:8080/app/<appname>
myapp.get('/app/:appname', middle.authenticate, middle.authenticate_app, app.get);

// Create node app 
// curl -X POST -u "testuser:123" -d "appname=test&start=hello.js" http://api.localhost:8080/apps
myapp.post('/app', middle.authenticate, app.post);


// App backend restart handler
myapp.get('/app_restart', app.app_restart);

// Update node app
// start=hello.js - To update the initial run script
// running=true - To Start the app
// running=false - To Stop the app
// curl -X PUT -u "testuser:123" -d "appname=test&start=hello.js" http://api.localhost:8080/app
// curl -X PUT -u "testuser:123" -d "appname=test&running=true" http://api.localhost:8080/app
// curl -X PUT -u "testuser:123" -d "appname=test&running=false" http://api.localhost:8080/app
// curl -X PUT -u "testuser:123" -d "appname=test&running=restart" http://api.localhost:8080/app
// TODO - Fix this function, it's not doing callbacking properly so will return JSON in the wrong state!
myapp.put('/app', middle.authenticate, middle.authenticate_app, app.put);

// Delete your nodejs app 
// curl -X DELETE -u "testuser:123" -d "appname=test" http://api.localhost:8080/apps
myapp.delete('/app', middle.authenticate, middle.authenticate_app, app.delete);

/*{{{
// APP NPM Handlers
// http://user:pass@api.localhost:8080/npm

myapp.post('/appnpm', function(req, res, next) {
  var appname = req.param("appname").toLowerCase();
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

    (function(){
    if(good_action === true) {
      var app_user_home = config.opt.home_dir + '/' + config.opt.hosted_apps_subdir + '/' + user._id + '/' + app.repo_id;
      sys.puts(action + " " + package + " into " + app_user_home);
      var cmd = 'npm ' + action + ' ' + package + ' --root ' + app_user_home + '/.node_libraries --binroot ' + app_user_home + '/.npm_bin --manpath ' + app_user_home + '/.npm_man';
      var pr = exec(cmd, function (err, stdout, stderr) {
        var rtv = "stdout: " + stdout + "\nstderr: " + stderr;
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.write(JSON.stringify({"status": 'success', output: rtv}) + '\n');
        res.end();
      });
/*
      Why oh why doesn't this work.. Still the code above is, so that's good for me!
      var app_user_home = config.opt.home_dir + '/' + config.opt.hosted_apps_subdir + '/' + user._id + '/' + app.repo_id;
      var n = new npmwrapper();
      n.setup(app_user_home + '/.node_libraries', app_user_home + '/.npm_bin', app_user_home + '/.npm_man', action, package);
      n.run(function (output) {
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.write(JSON.stringify({"status": 'success', output: output}) + '\n');
        res.end();
      });
* /
    } else {
      res.writeHead(400, {'Content-Type': 'application/json'});
      res.write('{"status": "failure - invalid action parameter"}\n');
      res.end();
    }
    })();
  });
});

myapp.post('/appdomains', function(req, res, next) {
  var appname = req.param("appname").toLowerCase();
  var action = req.param("action");
  var domain = req.param("domain");
  authenticate_app(req.headers.authorization, appname, res, function (user, app) {
    switch (action) {
      case "add":
        var gooddomain = lib.checkDomain(domain);
        if (gooddomain === true) {
          request({uri:couch_loc + 'aliasdomains/' + domain, method:'GET', headers:h}, function (err, response, body) {
            var doc = JSON.parse(body);
            if (doc._id){
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.write('{"status": "failure - domain already exists"}\n');
              res.end();
            } else {
              request({uri:couch_loc + 'aliasdomains', method:'POST', body: JSON.stringify({_id: domain, appname: appname}), headers: h}, function (err, response, body) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.write('{"status": "success", "message": "Domain added."}\n');
                res.end();
              });
            }
          });
        } else {
          res.writeHead(400, {'Content-Type': 'application/json'});
          res.write('{"status": "failure - ' + gooddomain + '"}\n');
          res.end();
        }
        break;
      case "delete":
        var gooddomain = lib.checkDomain(domain);
        if (gooddomain === true) {
          request({uri:couch_loc + 'aliasdomains/' + domain, method:'GET', headers:h}, function (err, response, body) {
            var doc = JSON.parse(body);
            if (doc._id) {
              if (doc.appname == appname) {
                request({uri:couch_loc + 'aliasdomains/' + domain + '?rev=' + doc._rev, method:'DELETE', headers:h}, function (err, response, body) {
                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.write('{"status": "success", "message": "Domain deleted."}\n');
                  res.end();
                });
              } else {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.write('{"status": "failure - domain is not for this app."}\n');
                res.end();
              }
            } else {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.write('{"status": "failure - domain not found."}\n');
                res.end();
            }
          });
        } else {
          res.writeHead(400, {'Content-Type': 'application/json'});
          res.write('{"status": "failure - ' + gooddomain + '"}\n');
          res.end();
        }
        break;
      default:
        res.writeHead(400, {'Content-Type': 'application/json'});
        res.write('{"status": "failure - invalid action parameter"}\n');
        res.end();
        break;
    }
  });
});


myapp.get('/applogs/:appname', function(req, res, next) {
  var appname = req.param("appname").toLowerCase();
//  var num = parseInt(req.param("num"));
  authenticate_app(req.headers.authorization, appname, res, function (user, app) {
    var app_user_home = config.opt.home_dir + '/' + config.opt.hosted_apps_subdir + '/' + user._id + '/' + app.repo_id;
    fs.readFile(app_user_home + '/error.log', function (err, body) {
      if (err) {
        var code = 500;
        var resp = {error: "Failed to read error log."};
      } else {
        var code = 200;
        var lines = body.toString().split("\n");
        lines = lines.slice(-100);
        var resp = {success: true, lines: lines};
      }
      res.writeHead(code, {'Content-Type': 'application/json'});
      res.write(JSON.stringify(resp) + '\n');
      res.end();
    });
  });
});




}}}*/


myapp.use(express.errorHandler({ showStack: true }));
myapp.listen(4001); 
console.log('Nodester app started on port 4001');
