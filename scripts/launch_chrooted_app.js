#!/usr/bin/env node
var 
  daemontools = require('daemon-tools'),
  Script = process.binding('evals').Script,
  fs = require('fs'),
  sys = require('sys'),
  request = require('request'),
  Logger = require('../classes/logger').logger
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

/*
var logger = new Logger();
logger.setup(app_name, function (err) {
  if (err != null) throw new Error(err);
*/
  daemontools.chroot(chroot_dir);
  var pid = daemontools.start(true);
  // daemontools.setreuid_username(effective_user);
  daemontools.setreuid(effective_user);
  daemontools.lock("/.app.pid");
  fs.chmodSync("/.app.pid", 0666);
  var error_log_fd = fs.openSync('/error.log', 'w');
  process.on('uncaughtException', function (err) {
    fs.write(error_log_fd, sys.inspect(err));
  });
  daemontools.closeIO();

  var sandbox = {
    process: process,
    require: require,
    console: console,
    __filename: exec_script,
    __dirname: "/",
    module: {
      id: '.'
    , exports: {}
    , parent: undefined
    , moduleCache: { }
    , filename: exec_script
    , loaded: false
    , exited: false
    , children: []
    },
    clearInterval: clearInterval,
    clearTimeout: clearTimeout,
    setInterval: setInterval,
    setTimeout: setTimeout
  };

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
/*
  sandbox.logger = function (args) {
    logger.log(args.toString(), function (err) {
      if (err != null) console.log(err);
    });
  };
  sandbox.process.stdout.write = function (args) {
    logger.log("stdout: " + args.toString(), function (err) {
      if (err != null) console.log(err);
    });
  };
  sandbox.console.log = function (args) {
    logger.log("stdout: " + args.toString(), function (err) {
      if (err != null) console.log(err);
    });
  };
  sandbox.console.warn = sandbox.console.error = function (args) {
    logger.log("stderr: " + args.toString(), function (err) {
      if (err != null) console.log(err);
    });
  };
*/
  sandbox.require.main = sandbox.module;
  sandbox.require.paths = ['/.node_libraries'];
  sandbox.process.on('uncaughtException', function (err) {
    fs.write(error_log_fd, sys.inspect(err));
  });
  fs.readFile(exec_script, function (err, script_src) {
    if (err) {
      console.log(err);
      process.exit(1);
    } else {
      Script.runInNewContext(
        script_src, sandbox, exec_script
      );
    }
  });
/*
});
*/
