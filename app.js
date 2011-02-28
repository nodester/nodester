/* 

Nodester opensource Node.js hosting service

Written by: @ChrisMatthieu & @DanBUK
http://nodester.com

*/

var express = require('express'),
    url = require('url'),
    sys = require('sys'),
    config = require('./config'),
    middle = require('./lib/middle');

process.on('uncaughtException', function (err) {
   console.log(err.stack);
});

var myapp = express.createServer();

myapp.configure(function(){
  myapp.use(express.bodyDecoder());
  myapp.use(express.staticProvider(config.opt.public_html_dir));
  myapp.use(middle.error());
});

// Routes
// Homepage
myapp.get('/', function(req, res, next){
  res.render('index.html');
});

// Status API
// http://localhost:4001/status 
// curl http://localhost:4001/status
var status = require('./lib/status');
myapp.get('/status', status.get);

// New coupon request
// curl -X POST -d "email=dan@nodester.com" http://localhost:4001/coupon
var coupon = require('./lib/coupon');
myapp.post('/coupon', coupon.post);

// curl http://localhost:4001/unsent
myapp.get('/unsent', coupon.unsent);


// New user account registration
// curl -X POST -d "user=testuser&password=123&email=chris@nodefu.com&coupon=hiyah" http://localhost:4001/user
// curl -X POST -d "user=me&password=123&coupon=hiyah" http://localhost:4001/user
var user = require('./lib/user');
myapp.post('/user', user.post);

// localhost requires basic auth to access this section
// Edit your user account 
// curl -X PUT -u "testuser:123" -d "password=test&rsakey=1234567" http://localhost:4001/user
myapp.put('/user', middle.authenticate, user.put);

// Delete your user account 
// curl -X DELETE -u "testuser:123" http://localhost:4001/user
myapp.delete('/user', middle.authenticate, user.delete);

// All Applications info
// http://chris:123@localhost:4001/apps
// curl -u "testuser:123" http://localhost:4001/apps
var apps = require('./lib/apps');
myapp.get('/apps', middle.authenticate, apps.get);


var app = require('./lib/app');
// Application info
// http://chris:123@localhost:4001/app/<appname>
// curl -u "testuser:123" http://localhost:4001/app/<appname>
myapp.get('/app/:appname', middle.authenticate, middle.authenticate_app, app.get);

// Create node app 
// curl -X POST -u "testuser:123" -d "appname=test&start=hello.js" http://localhost:4001/apps
myapp.post('/app', middle.authenticate, app.post);


// App backend restart handler
myapp.get('/app_restart', app.app_restart);
myapp.get('/app_start', app.app_start);
myapp.get('/app_stop', app.app_stop);

// Update node app
// start=hello.js - To update the initial run script
// running=true - To Start the app
// running=false - To Stop the app
// curl -X PUT -u "testuser:123" -d "appname=test&start=hello.js" http://localhost:4001/app
// curl -X PUT -u "testuser:123" -d "appname=test&running=true" http://localhost:4001/app
// curl -X PUT -u "testuser:123" -d "appname=test&running=false" http://localhost:4001/app
// curl -X PUT -u "testuser:123" -d "appname=test&running=restart" http://localhost:4001/app
// TODO - Fix this function, it's not doing callbacking properly so will return JSON in the wrong state!
myapp.put('/app', middle.authenticate, middle.authenticate_app, app.put);

// Delete your nodejs app 
// curl -X DELETE -u "testuser:123" -d "appname=test" http://localhost:4001/apps
myapp.delete('/app', middle.authenticate, middle.authenticate_app, app.delete);

// curl -u "testuser:123" -d "appname=test" http://localhost:4001/applogs
myapp.get('/applogs/:appname', middle.authenticate, middle.authenticate_app, app.logs);

// APP NPM Handlers
var npm = require('./lib/npm');
// curl -X POST -u "testuser:123" -d "appname=test&package=express" http://localhost:4001/appnpm
// curl -X POST -u "testuser:123" -d "appname=test&package=express" http://localhost:4001/npm
// curl -X POST -u "testuser:123" -d "appname=test&package=express,express-extras,foo" http://localhost:4001/npm
myapp.post('/appnpm', middle.authenticate, middle.authenticate_app, npm.post);
myapp.post('/npm', middle.authenticate, middle.authenticate_app, npm.post);

//TODO this should be .post and .delete, there should be no action..
// curl -X POST -u "testuser:123" -d "appname=test&domain=<domainname>&action=add" http://localhost:4001/appdomains
// curl -X POST -u "testuser:123" -d "appname=test&domain=<domainname>&action=delete" http://localhost:4001/appdomains
var domains = require('./lib/domains');
myapp.post('/appdomains', middle.authenticate, middle.authenticate_app, domains.post);
myapp.get('/appdomains', middle.authenticate, domains.get);


myapp.use(express.errorHandler({ showStack: true }));
myapp.listen(4001); 
console.log('Nodester app started on port 4001');
