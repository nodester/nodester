#!/usr/bin/env node

var nodeControl = require('../deps/node-control/index.js');
var util = require('util');
var ins = util.inspect;
var config = { user: process.env.USER };

var print_lines_prefix = function (prefix, lines) {
  var i = 0, l = lines.length;
  for(i = 0; i < l; i++) {
    if (i < (l - 1) || lines[i].length > 0) console.log('%s: %s', prefix, lines[i]);
  }
}

var hosts = nodeControl.hosts(config, ['node01', 'node02', 'node03', 'node04']);
var l = hosts.length,
    i = 0;
for(i = 0; i < l; i++) {
  (function () {
    
    var my_i = i;
    var my_host = hosts[my_i];
    my_host.ssh('hostname -s', my_host.address, function (err, stdout, stderr) {
      if (err) {
        console.error('host %d error: %s', my_i, err.toString());
      }
      if (stdout.length > 0) print_lines_prefix(my_host.address, stdout.split('\n'));
      if (stderr.length > 0) print_lines_prefix(my_host.address + ' ERROR: ', stderr.split('\n'));
    });
  })();
}