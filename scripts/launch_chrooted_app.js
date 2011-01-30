#!/usr/bin/env node

var 
  daemontools = require('daemon-tools'),
  Script = process.binding('evals').Script,
  fs = require('fs');
;

require.paths.shift();
require.paths.shift();
require.paths.unshift('/.node_libraries');

process.argv.shift();
process.argv.shift();
var chroot_dir = process.argv.shift();
var exec_script = process.argv.shift();

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
  }
};

sandbox.process.installPrefix = '/';
sandbox.process.ARGV = ['node', exec_script];
sandbox.process.argv = sandbox.process.ARGV;
sandbox.process.env = sandbox.process.ENV = {};
sandbox.process.mainModule = sandbox.module;
sandbox.process.kill = function () { return 'process.kill is disabled' };
sandbox.require.main = sandbox.module;
sandbox.require.paths = ['/.node_libraries'];

daemontools.chroot(chroot_dir);
var pid = daemontools.start(true);
sandbox.process.pid = pid;
daemontools.setreuid(222);
daemontools.lock("/.app.pid");
daemontools.closeIO();

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
