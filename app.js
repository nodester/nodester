#!/usr/bin/env node

/*

Nodester opensource Node.js hosting service

Written by: @ChrisMatthieu & @DanBUK
http://nodester.com

*/
require('coffee-script');

var express = require('express'),
  url = require('url'),
  sys = require('sys'),
  config = require('./config'),
  middle = require('./lib/middle');

process.on('uncaughtException', function (err) {
  console.log(err.stack);
});

var daemon = require('daemon');
// daemon.setreuid(config.opt.userid);
var myapp = express.createServer();

myapp.configure(function () {
  myapp.use(express.bodyParser());
  myapp.use(express.static(config.opt.public_html_dir));
  myapp.use(express.errorHandler({
    showStack: true,
    dumpExceptions: true
  }));
});


//setup the errors
myapp.error(function (err, req, res, next) {
  if (err instanceof NotFound) {
    res.sendfile(__dirname + '/public/404.html');
    // res.render('404.html');
  } else {
    res.sendfile(__dirname + '/public/500.html');
    // res.render('500.html');
  }
});


// Routes
// Homepage
myapp.get('/', function (req, res, next) {
  res.sendfile(__dirname +'/public/index.html');
});

myapp.get('/api', function (req, res, next) {
  res.redirect('/api.html');
});

myapp.get('/admin', function (req, res, next) {
  res.redirect('http://admin.nodester.com');
});

myapp.get('/irc', function (req, res, next) {
  res.redirect('http://irc.nodester.com');
});

myapp.get('/monitor', function (req, res, next) {
  res.redirect('http://site.nodester.com');
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
myapp.del('/user', middle.authenticate, user.delete);

// All Applications info
// http://chris:123@localhost:4001/apps
// curl -u "testuser:123" http://localhost:4001/apps
var apps = require('./lib/apps');
myapp.get('/apps', middle.authenticate, apps.get);


var app = require('./lib/app');
// Application info
// http://chris:123@localhost:4001/apps/<appname>
// curl -u "testuser:123" http://localhost:4001/apps/<appname>
myapp.get('/apps/:appname', middle.authenticate, middle.authenticate_app, app.get);
myapp.get('/app/:appname', middle.deprecated, middle.authenticate, middle.authenticate_app, app.get); // deprecated

// Create node app
// curl -X POST -u "testuser:123" -d "appname=test&start=hello.js" http://localhost:4001/apps
myapp.post('/apps/:appname', middle.authenticate, app.post);
myapp.post('/apps', middle.authenticate, app.post);
myapp.post('/app', middle.deprecated, middle.authenticate, app.post); // deprecated

// App backend restart handler
myapp.get('/app_restart', app.app_restart);
myapp.get('/app_start', app.app_start);
myapp.get('/app_stop', app.app_stop);

// Update node app
// start=hello.js - To update the initial run script
// running=true - To Start the app
// running=false - To Stop the app
// curl -X PUT -u "testuser:123" -d "start=hello.js" http://localhost:4001/apps/test
// curl -X PUT -u "testuser:123" -d "running=true" http://localhost:4001/apps/test
// curl -X PUT -u "testuser:123" -d "running=false" http://localhost:4001/apps/test
// curl -X PUT -u "testuser:123" -d "running=restart" http://localhost:4001/apps/test
// TODO - Fix this function, it's not doing callbacking properly so will return JSON in the wrong state!
myapp.put('/apps/:appname', middle.authenticate, middle.authenticate_app, app.put);
myapp.put('/app', middle.deprecated, middle.authenticate, middle.authenticate_app, app.put); // deprecated

// Delete your nodejs app
// curl -X DELETE -u "testuser:123" -d http://localhost:4001/apps/test
myapp.del('/apps/:appname', middle.authenticate, middle.authenticate_app, app.delete);
myapp.del('/app/:appname', middle.deprecated, middle.authenticate, middle.authenticate_app, app.delete); // deprecated

myapp.del('/gitreset/:appname', middle.authenticate, middle.authenticate_app, app.gitreset);

// curl -u "testuser:123" -d "appname=test" http://localhost:4001/applogs
myapp.get('/applogs/:appname', middle.authenticate, middle.authenticate_app, app.logs);

// Retrieve information about or update a node app's ENV variables
// This fulfills all four RESTful verbs.
// GET will retrieve the list of all keys.
// PUT will either create or update.
// DELETE will delete the key if it exists.
// curl -u GET -u "testuser:123" -d "appname=test" http://localhost:4001/env
// curl -u PUT -u "testuser:123" -d "appname=test&key=NODE_ENV&value=production" http://localhost:4001/env
// curl -u DELETE -u "testuser:123" -d "appname=test&key=NODE_ENV" http://localhost:4001/env

// Get info about available versions.
// NOTE: I think putting these at /env/ is a good choice since they are environment settings
// curl -XGET http://localhost:4001/env/version
myapp.get('/env/version', app.env_version);
// Get info about a specific version and see if it's installed
// without need of basic auth
// curl -XGET http://localhost:4001/env/:version
myapp.get('/env/version/:version', app.check_env_version);
myapp.get('/env/:appname', middle.authenticate, middle.authenticate_app, app.env_get);
myapp.put('/env', middle.authenticate, middle.authenticate_app, app.env_put);
myapp.del('/env/:appname/:key', middle.authenticate, middle.authenticate_app, app.env_delete);

// APP NPM Handlers
var npm = require('./lib/npm');
// curl -X POST -u "testuser:123" -d "appname=test&package=express" http://localhost:4001/appnpm
// curl -X POST -u "testuser:123" -d "appname=test&package=express" http://localhost:4001/npm
// curl -X POST -u "testuser:123" -d "appname=test&package=express,express-extras,foo" http://localhost:4001/npm
myapp.post('/appnpm', middle.authenticate, middle.authenticate_app, npm.post);
myapp.post('/npm', middle.authenticate, middle.authenticate_app, npm.post);

// curl -X POST -u "testuser:123" -d "appname=test&domain=<domainname>" http://localhost:4001/appdomains
// curl -X DELETE -u "testuser:123" -d "appname=test&domain=<domainname>" http://localhost:4001/appdomains
var domains = require('./lib/domains');
myapp.post('/appdomains', middle.authenticate, middle.authenticate_app, domains.post);
myapp.del('/appdomains/:appname/:domain', middle.authenticate, middle.authenticate_app, domains.delete);
myapp.get('/appdomains', middle.authenticate, domains.get);

// curl -X POST -d "user=username" http://localhost:4001/reset_password
// curl -X PUT -d "password=newpassword" http://localhost:4001/reset_password/<token>
var reset_password = require('./lib/reset_password');
myapp.post('/reset_password', reset_password.post);
myapp.put('/reset_password/:token', reset_password.put);


// myapp.use(express.errorHandler({
//   showStack: true
// }));

myapp.listen(4001);
console.log('Nodester app started on port 4001');

//nodeinfo.broadcast(13377);
//console.log('NodeInfo monitor started on port 13377');
//The 404 Route (ALWAYS Keep this as the last route)
myapp.get('/*', function (req, res) {
  throw new NotFound;
});


function NotFound(msg) {
  this.name = 'NotFound';
  Error.call(this, msg);
  Error.captureStackTrace(this, arguments.callee);
};
