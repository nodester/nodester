#!/usr/bin/env node

/*

Nodester opensource Node.js hosting service

Written by: @_alejandromg
http://nodester.com

*/

var express = require('express'),
    url     = require('url'),
    sys     = require('sys'),
    config  = require('./config'),
    middle  = require('./lib/middle');

process.on('uncaughtException', function (err) {
  console.log(err.stack);
});


// daemon.setreuid(config.opt.userid);
var myapp = express.createServer();

myapp.configure(function () {
  myapp.use(express.bodyParser());
  myapp.use(express.static(__dirname+'/public/images'));
  myapp.use(express.errorHandler({
    showStack: true,
    dumpExceptions: true
  }));
});


// Error handler
myapp.error(function (err, req, res, next) {
  if (err instanceof NotFound) {
    res.sendfile(__dirname + '/public/404.html');
  } else {
    res.sendfile(__dirname + '/public/500.html');
  }
});

/* Routes  */
myapp.all('*',function(req,res,next){
  res.sendfile(__dirname+'/public/offline.html');
})
myapp.all('/images/*',function(req,res){
  res.sendfile(__dirname+'/public/'+req.url);
})
myapp.get('/',function(req,res){
  res.sendfile(__dirname+'/public/offline.html');
})
// Homepage
myapp.listen(4001);
console.log('Nodester mainteinance app started on port 4001');


function NotFound(msg) {
  this.name = 'NotFound';
  Error.call(this, msg);
  Error.captureStackTrace(this, arguments.callee);
};
