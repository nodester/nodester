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

// curl -u "testuser:123" -d "appname=test" http://api.localhost:8080/applogs
myapp.get('/applogs/:appname', middle.authenticate, middle.authenticate_app, app.logs);

// APP NPM Handlers
var npm = require('./lib/npm');
// http://user:pass@api.localhost:8080/appnpm
// http://user:pass@api.localhost:8080/npm
myapp.post('/appnpm', middle.authenticate, middle.authenticate_app, npm.post);
myapp.post('/npm', middle.authenticate, middle.authenticate_app, npm.post);

/*{{{
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






}}}*/


myapp.use(express.errorHandler({ showStack: true }));
myapp.listen(4001); 
console.log('Nodester app started on port 4001');
