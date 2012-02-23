#!/usr/bin/env node

var exec = require('child_process').exec;

// Install all the versions
// But ignore these because they are too old
var ignore = [0,0.1,0.2,0.3];

var installVersion = function(_version){
  console.log('[INFO] This may take a while, go and grab some coffee');
  // Like sudoer?
  var execute = function(v){
    console.log('[INFO] installing node-v'+ v.trim());
    exec('n ' + v.trim(), function(e,d){
        if (e) console.log(e);
    });
  };
  if (_version){
    execute(_version);
  } else {
    exec('n', function(error,list){
      if (!error) {
        exec('n list', function(e,d){
          if (!e) {
            var installed = list.split('\n');
            d.split('\n').forEach(function(v){
              var version = parseFloat(v.trim());
              if (!isNaN(version) && ignore.indexOf(version) === -1
                                  && list.indexOf(v) === -1) {
                execute(v);
              }
            });
          } else {
            console.log('[ERROR] getting list of node versions');
          }
        });
      } else {
        console.log('[ERROR] maybe `n` is not installed');
      }
    });
  }
};

// TO execute this module you need to pass the param --run
if (process.argv[2] === '--run') installVersion();

module.exports = exports = new installVersion;