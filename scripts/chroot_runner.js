#!/usr/bin/env node
var child_process = require('child_process').spawn;
var daemon = require('daemon');
var fs = require('fs');
var path = require('path');

var config = JSON.parse(fs.readFileSync(path.join('.nodester', 'config.json'), encoding='utf8'));

var run_max = 5;
var run_count = 0;
// var run_count = typeof process.argv[2] != 'undefined' ? parseInt(process.argv[2]) : 0;

var LOG_STDOUT = 1;
var LOG_STDERR = 2;

var error_log_fd = null;

var pre_shutdown = function () {
  if (typeof error_log_fd != 'null') fs.closeSync(error_log_fd);
};

var log_line = function (line, stdout) {
  if (typeof this == 'string') {
    line = this + line;
  }
  if (typeof stdout != 'undefined') {
    if (stdout == LOG_STDOUT) {
      console.log(line);
    } else if (stdout == LOG_STDERR) {
      console.error(line);
    }
  }
  if (typeof error_log_fd != 'null') fs.write(error_log_fd, line + '\n');
};

var env = {
    PATH: '/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin',
    NODE_ENV: 'production'
};
if (config.env) {
    Object.keys(config.env).forEach(function (key) {
        env[key] = String(config.env[key]);
    });
}
env.app_port = parseInt(config.port);
env.app_host = config.ip;
var args = [];

var chroot_res = daemon.chroot(config.apphome);
if (chroot_res != true) {
  log_line('chroot_runner: ', 'Failed to chroot to ' + config.apphome, LOG_STDERR);
  pre_shutdown();
  process.exit(1);
}
var ch_uid = daemon.setreuid(config.userid);
if (ch_uid != true) {
  log_line.call('chroot_runner: ', 'Failed to change user to ' + config.userid, LOG_STDERR);
  pre_shutdown();
  process.exit(2);
}
var child = null;
var child_watcher_time = null;
error_log_fd = fs.openSync('/error.log', 'w');

var start_child = function () {
  child = child_process.spawn(config.start, args, { env: env });
  child.stdout.on('data', log_line.bind('stdout: '));
  child.stderr.on('data', log_line.bind('stderr: '));
  child.on('exit', function (code) {
    if (code > 0 && run_count > run_max) {
      log_line.call('Watcher: ', 'Error: Restarted too many times, bailing.', LOG_STDERR);
      clearInterval(child_watcher_timer);
      pre_shutdown();
      process.exit(3);
    } else if (code > 0) {
      log_line.call('Watcher: ', 'Process died with exit code ' + code + '. Restarting...', LOG_STDERR);
      child = null;
    } else {
      log_line.call('Watcher: ', 'Process exited cleanly. Dieing.', LOG_STDERR);
      clearInterval(child_watcher_timer);
      pre_shutdown();
      process.exit(0);
    }
  });
};
var child_watcher = function () {
  if (child == null) {
    start_child();
    run_count++;
  }
};
child_watcher_timer = setInterval(child_watcher, 750);
