#!/usr/bin/env node

var exec = require('child_process').exec;
var config = require('../config.js').opt;

var cmd = 'mkdir ' + process.argv[2];

var cmds = [
  'mkdir ' + process.argv[2],
  'chown ' + config.userid + ':' + config.userid + ' ' + process.argv[2]
]

var do_cmd = function () {
  if (cmds.length > 0) {
    var cmd = cmds.shift();
    exec(cmd, function () {
      do_cmd();
    });
  }
}