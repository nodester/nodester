#!/usr/bin/env node

/*jshint laxcomma:true, node:true */

"use strict";
var cp     = require('child_process')
  , cradle   = require('cradle')
  , request = require('request')
  , async  = require('async')
  , config = require('../config')
  , app    = require('../lib/app')
  , exec   = cp.exec;
  
require('colors');

var cfg = config.opt
  , port = cfg.couch_port
  , host = cfg.couch_host
  , user = cfg.couch_user
  , pass = cfg.couch_pass
  , range =cfg.bach_range || 10;

// function request(opt, cb){
//   //console.dir(opt)
//   setTimeout(function(){
//     var running = true;
//     if (Math.floor(Math.random()*10)%2) {
//       running= false
//     }
//     //console.log(running);
//     var data = {
//       body: {
//         running: running
//       },
//     }
//     cb(null, data);
//   }, 1040)
// }


cradle.setup({
   host: host,
   cache: true, 
   raw: false,
    
   auth: {
     username: user,
     password: pass
   },
   port: port
 });

if (cfg.couch_prefix.length > 0) {
  var cprefix = cfg.couch_prefix + '_';
} else {
  var cprefix = '';
}



var bach = [];

var sliceArray = function(array){
  if (array.length) {
    // slice the apps on groups of bach_range 
    // To avoid overload in both parts
    bach.push(array.splice(0, range));
    sliceArray(array);
  } else {
    done();
  }
};

function iterator (app, cb){
  console.log('Restarting '.bold.grey, app.id);
  request({
    uri: 'http://' + cfg.api_dom + '/app/restart/' + app.id,
    method: 'PUT'
  }, function (err, data){
    if (err) {
      return cb(err);
    }
    if (data.body.running == 'true' || data.body.running === true){
      console.log(app.id, " Running ✔ ".bold.green);
      cb(null, 'ok');
    } else {
      console.log(app.id, data.body.running, " ✖".bold.red);
      cb(data.body.running);
    }
  });
}
function restartApp (apps) {
  return function (cb) {
    async.forEachLimit(apps, 10, iterator, function(err){
      if (err) return cb(err);
      cb(null,'ok');
    });
  };
}
function done(){
  if (bach.length){
    var tasks = [];
    bach.forEach(function(appl){
      tasks.push(restartApp.call(this, appl));
    });
    async.series(tasks, function (err, results){
      console.log(arguments);
    });
  }
}

var apps  = [],
    count = 0,
    g     = 0,
    f     = 0,
    good  = "SUCCESS ✔",
    bad   = "FAILURE ✖";

// Another bad idea but we don't want this thing crashing

process.on('uncaughtException', function (err) {
  console.log('UNCAUGHT ERROR! '.red + err);
});

var c = new(cradle.Connection), db = c.database(cprefix + 'apps');

db.view('nodeapps/all', function(err, doc){
  if (err) {
    console.error(err);
    process.kill(1);
  } else {
    sliceArray(doc);
  }
});
