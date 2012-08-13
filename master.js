//
//          Numbus
// Aprender es cosa de niños
//
//  2012 (c) for numbus LLC
//

/*jshint node:true, noempty:true, laxcomma:true, laxbreak:false */

"use strict";

var cluster = require('cluster')
  , path        = require('path')
  , cp          = require('child_process')
  , config      = require('./config').opt
  , pkg         = require('./package')
  , spawn       = cp.spawn
  , clusterConf = config.cluster || {}
  , logger      = require('bunyan').createLogger(config.log || {name: 'nodester'})
  , pro         = []
  , workers     = [];


// Share the app package to the childs
process.pkg = pkg;
process.appName = pkg.name;
process.appVersion = pkg.version;
process.root = __dirname;

// Map Bunyan to console.loh
console.error = logger.error.bind(logger);
console.log   = logger.info.bind(logger);
console.warn  = logger.warn.bind(logger);

// Get cpu cores
clusterConf.size = require('os').cpus().length;


function messageHandler (msg, id){
  // Emit to the whole network
  keys().forEach(function(id){
    get(id).send(msg);
  });
}

function keys (){
  return Object.keys(cluster.workers);
}

function get (id){
  return cluster.workers[id];
}

console.log('[*]', new Date(), 'Starting');
console.log('[*] Spawing servers on node-' + process.version);

// START ALL THE THINGS
if (cluster.isMaster) {
  // Fork workers.
  for (var i = 0; i < clusterConf.size; i++) {
    cluster.fork();
  }

  cluster.on('exit', function(worker, code, signal) {
    console.log('worker ' + worker.pid + ' died');
    keys().forEach(function (id){
        if (get(id).pid === worker.pid) delete cluster.workers[id];
        cluster.fork();
    });
  });

  keys().forEach(function(id) {
    get(id).on('message', messageHandler);
  });
} else {
    require('./app');
    pro.push(+new Date);
}

console.log('[*] Processing %d process', pro.length);


process.on('SIGINT',function(){
  for (var i=0; i < workers.length; i++) {
    console.log('dieing');
    workers[i].destroy();
  }
  process.exit(1);
});
