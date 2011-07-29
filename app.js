#!/usr/bin/env node

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

process.on('uncaughtException', function(err) {
  console.log(err.stack);
});

var daemon = require('daemon');
// daemon.setreuid(config.opt.main_user);
var myapp = express.createServer();

myapp.configure(function() {
  myapp.use(express.bodyParser());
  myapp.use(express.static(config.opt.main_static_dir));
  myapp.use(middle.error());
});

// Routes
// Homepage
myapp.get('/', function(req, res, next) {
  res.render('index.html');
});

myapp.get('/api', function(req, res, next) {
  res.redirect('/api.html');
});

myapp.get('/admin', function(req, res, next) {
  res.redirect('http://admin.nodester.com');
});

myapp.get('/irc', function(req, res, next) {
  res.redirect('http://irc.nodester.com');
});

// Status API
// http://<apiServer>/status 
// curl http://<apiServer>/status
var status = require('./lib/status');
myapp.get('/status', status.get);

// New coupon request
// curl -X POST -d "email=<emailId>" http://<apiServer>/coupon
var coupon = require('./lib/coupon');
myapp.post('/coupon', coupon.post);

// curl http://<apiServer>/unsent
myapp.get('/unsent', coupon.unsent);


// New user account registration
// curl -X POST -d "user=<username>&password=<password>&email=<emailId>&coupon=<couponCode>" http://<apiServer>/user
var user = require('./lib/user');
myapp.post('/user', user.post);

// localhost requires basic auth to access this section
// Edit your user account 
// curl -X PUT -u "<username>:<password>" -d "password=<password>&rsakey=<rsaPublicKey>" http://<apiServer>/user
myapp.put('/user', middle.authenticate, user.put);

// Delete your user account 
// curl -X DELETE -u "<username>:<password>" http://<apiServer>/user
myapp.delete('/user', middle.authenticate, user.delete);

// All Applications info
// http://<username>:<password>@<apiServer>/apps
// curl -u "<username>:<password>" http://<apiServer>/apps
var apps = require('./lib/apps');
myapp.get('/apps', middle.authenticate, apps.get);


var app = require('./lib/app');
// Application info
// http://<username>:<password>@<apiServer>/app/<appname>
// curl -u "<username>:<password>" http://<apiServer>/app/<appname>
myapp.get('/app/:appname', middle.authenticate, middle.authenticate_app, app.get);

// Create node app 
// curl -X POST -u "<username>:<password>" -d "appname=<appName>&start=hello.js" http://<apiServer>/apps
myapp.post('/app', middle.authenticate, app.post);


// App backend restart handler
myapp.get('/app_restart', app.app_restart);
myapp.get('/app_start', app.app_start);
myapp.get('/app_stop', app.app_stop);

// Update node app
// start=hello.js - To update the initial run script
// running=true - To Start the app
// running=false - To Stop the app
// curl -X PUT -u "<username>:<password>" -d "appname=<appName>&start=<startFile.js>" http://<apiServer>/app
// curl -X PUT -u "<username>:<password>" -d "appname=<appName>&running=<true|false|restart>" http://<apiServer>/app
// TODO - Fix this function, it's not doing callbacking properly so will return JSON in the wrong state!
myapp.put('/app', middle.authenticate, middle.authenticate_app, app.put);

// Delete your nodejs app 
// curl -X DELETE -u "<username>:<password>" -d "appname=<appName>" http://<apiServer>/apps
myapp.delete('/app', middle.authenticate, middle.authenticate_app, app.delete);


myapp.delete('/gitreset', middle.authenticate, middle.authenticate_app, app.gitreset);

// curl -u "<username>:<password>" -d "appname=<appName>" http://<apiServer>/applogs
myapp.get('/applogs/:appname', middle.authenticate, middle.authenticate_app, app.logs);

// Retrieve information about or update a node app's ENV variables
// This fulfills all four RESTful verbs.
// GET will retrieve the list of all keys.
// PUT will either create or update.
// DELETE will delete the key if it exists.
// curl -u GET -u "<username>:<password>" -d "appname=<appName>" http://<apiServer>/env
// curl -u PUT -u "<username>:<password>" -d "appname=<appName>&key=<envKey>&value=<envValue>" http://<apiServer>/env
// curl -u DELETE -u "<username>:<password>" -d "appname=<appName>&key=<envKey>" http://<apiServer>/env
myapp.get('/env', middle.authenticate, middle.authenticate_app, app.env_get);
myapp.put('/env', middle.authenticate, middle.authenticate_app, app.env_put);
myapp.delete('/env', middle.authenticate, middle.authenticate_app, app.env_delete);

// APP NPM Handlers
var npm = require('./lib/npm');
// curl -X POST -u "<username>:<password>" -d "appname=<appName>&package=express" http://<apiServer>/appnpm
// curl -X POST -u "<username>:<password>" -d "appname=<appName>&package=express" http://<apiServer>/npm
// curl -X POST -u "<username>:<password>" -d "appname=<appName>&package=express,express-extras,foo" http://<apiServer>/npm
myapp.post('/appnpm', middle.authenticate, middle.authenticate_app, npm.post);
myapp.post('/npm', middle.authenticate, middle.authenticate_app, npm.post);

// curl -X POST -u "<username>:<password>" -d "appname=<appName>&domain=<domainname>" http://<apiServer>/appdomains
// curl -X DELETE -u "<username>:<password>" -d "appname=<appName>&domain=<domainname>" http://<apiServer>/appdomains
var domains = require('./lib/domains');
myapp.post('/appdomains', middle.authenticate, middle.authenticate_app, domains.post);
myapp.delete('/appdomains', middle.authenticate, middle.authenticate_app, domains.delete);
myapp.get('/appdomains', middle.authenticate, domains.get);


myapp.use(express.errorHandler({
  showStack: true
}));

// Listen only if directly invoked .. to make it multinode ready
if (!module.parent) {
  myapp.listen(config.opt.main_app_port);
  console.log('Nodester app started on port %d', myapp.address().port);
}