#!/usr/bin/env node
var 
  daemontools = require('daemon-tools'),
  Script = process.binding('evals').Script,
  fs = require('fs'),
  util = require('util'),
  Module = require('module')
;

require.paths.shift();
require.paths.shift();
require.paths.unshift('/.node_libraries');
process.argv.shift();
process.argv.shift();

var effective_user = process.argv.shift();
var chroot_dir = process.argv.shift();
var exec_script = process.argv.shift();
var app_port = parseInt(process.argv.shift());
var app_host = process.argv.shift();
var app_name = process.argv.shift();

daemontools.chroot(chroot_dir);
var pid = daemontools.start(true);
daemontools.setreuid(effective_user);
daemontools.lock("/.app.pid");
fs.chmodSync("/.app.pid", 0666);
var error_log_fd = fs.openSync('/error.log', 'w');
process.on('uncaughtException', function (err) {
  fs.write(error_log_fd, util.inspect(err));
});
daemontools.closeIO();

var sandbox = {
  global: {},
  process: process,
  require: require,
  console: console,
  module: {},
  __filename: exec_script,
  __dirname: "/",
  clearInterval: clearInterval,
  clearTimeout: clearTimeout,
  setInterval: setInterval,
  setTimeout: setTimeout
};

sandbox.module = new Module();
sandbox.module.id = '.';
sandbox.module.filename = '/' + exec_script;
sandbox.module.paths = ['/'];

sandbox.process.pid = pid;
sandbox.process.installPrefix = '/';
sandbox.process.ARGV = ['node', exec_script];
sandbox.process.argv = sandbox.process.ARGV;
sandbox.process.env = sandbox.process.ENV = {
  'app_port': app_port,
  'app_host': app_host
};
sandbox.process.mainModule = sandbox.module;
sandbox.process.kill = function () { return 'process.kill is disabled' };
sandbox.process.stdout.write = sandbox.console.warn = sandbox.console.error = function (args) {
  fs.write(error_log_fd, args.toString());
};
sandbox.require.main = sandbox.module;
sandbox.require.cache = {};
sandbox.require.cache['/' + exec_script] = sandbox.module;
sandbox.require.paths = ['/.node_libraries'];
sandbox.process.on('uncaughtException', function (err) {
  fs.write(error_log_fd, util.inspect(err));
});

fs.readFile(exec_script, function (err, script_src) {
  console.log('readFile');
  if (err) {
    console.log(err);
    process.exit(1);
  } else {
    Script.runInNewContext(
      script_src, sandbox, exec_script
    );
  }
});
