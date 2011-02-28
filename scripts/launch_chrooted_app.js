#!/usr/bin/env node
var fs = require('fs'),
    path = require('path'),
    util = require('util'),
    Script = process.binding('evals').Script,
    Module = require('module');

require.paths.shift();
require.paths.shift();

var config = JSON.parse(fs.readFileSync(path.join('.nodester', 'config.json'), encoding='utf8'));

console.log(config);

//These 3 lines ensure that we get the daemon-tools setup by the nodester user and not the
// one available to root, since we are sudoed at this point
require.paths.unshift(path.join(config.appdir, '../', '.node_libraries'));
require.paths.unshift('/.node_libraries');
var daemontools = require('daemon-tools');

var effective_user = config.userid;
var chroot_dir = config.apphome;
var exec_script = config.start;
var app_port = parseInt(config.port);
var app_host = config.ip;
var app_name = config.name;

daemontools.chroot(chroot_dir);
var pid = daemontools.start(true);
daemontools.setreuid(effective_user);
daemontools.lock("/.app.pid");
fs.chmodSync("/.app.pid", 0666);
var error_log_fd = fs.openSync('/error.log', 'w');
process.on('uncaughtException', function (err) {
  fs.write(error_log_fd, err.stack);
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
    try {
      process.setuid(501);
    } catch (err) {
        console.log(err.stack);
    }
    if (err) {
        console.log(err.stack);
        process.exit(1);
    } else {
        Script.runInNewContext(script_src, sandbox, exec_script);
    }
});
