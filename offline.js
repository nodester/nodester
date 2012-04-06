#!/usr/bin/env node

/*

Nodester opensource Node.js hosting service

Written by: @_alejandromg
http://nodester.com

*/

var express = require('express')
  , url     = require('url')
  , sys     = require('sys')
  , config  = require('./config')
  , middle  = require('./lib/middle')
  ;

process.on('uncaughtException', function (err) {
  console.log(new Date,'=> '+ err.message)
  console.log(err.stack);
});

var app = express.createServer();

app.configure(function () {
  app.use(express.bodyParser());
  app.use(express.static(__dirname+'/public/images'));
  app.use(express.errorHandler({
    showStack: true,
    dumpExceptions: true
  }));
});


// Error handler
app.error(function (err, req, res, next) {
  if (err instanceof NotFound) {
    res.sendfile(__dirname + '/public/404.html');
  } else {
    res.sendfile(__dirname + '/public/500.html');
  }
});

/* Routes  */
app.all('*',function(req,res,next){
  res.sendfile(__dirname+'/public/offline.html');
})
app.all('/images/*',function(req,res){
  res.sendfile(__dirname+'/public/'+req.url);
})
app.get('/',function(req,res){
  res.sendfile(__dirname+'/public/offline.html');
})
// Homepage
app.listen(4001);
console.log('Nodester mainteinance app started on port 4001');


function NotFound(msg) {
  this.name = 'NotFound';
  Error.call(this, msg);
  Error.captureStackTrace(this, arguments.callee);
};
