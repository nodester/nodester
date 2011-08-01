#!/usr/bin/env node

var exec = require('child_process').exec;

var app_dir = process.argv[2];
var app_dir_rw = app_dir + '_rw';
var git_dir = process.argv[3];

var cmds = [
  'rm -Rf ' + app_dir,
  'rm -Rf ' + app_dir_rw,
  'rm -Rf ' + git_dir
];

var do_cmd = function () {
  if (cmds.length > 0) {
    var cmd = cmds.shift();
    console.log(cmd);
    exec(cmd, function () {
      do_cmd();
    });
  }
};

do_cmd();