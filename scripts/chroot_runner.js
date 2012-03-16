#!/usr/bin/env node

require.paths.unshift('/usr/lib/node_modules');

var spawn = require('child_process').spawn;
var daemon = require('daemon');
var fs = require('fs');
var path = require('path');
var net = require('net');
var node_versions = require('../lib/lib').node_versions();

var config = JSON.parse(fs.readFileSync(path.join('.nodester', 'config.json'), encoding = 'utf8'));

var oldmask, newmask = 0000;

oldmask = process.umask(newmask);
console.log('Changed umask from: ' + oldmask.toString(8) + ' to ' + newmask.toString(8));

var run_max = 5;
var run_count = 0;

var LOG_STDOUT = 1;
var LOG_STDERR = 2;


var env = {
  PATH: '/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin',
  NODE_ENV: 'production'
};
if (config.env) {
  Object.keys(config.env).forEach(function (key) {
    env[key] = String(config.env[key]);
  });
}
env.app_port = parseInt(config.port, 10);
env.app_host = config.ip;
var args = ['/app/' + config.start];
var chroot_res = daemon.chroot(config.appchroot);
if (chroot_res !== true) {
  log_line('chroot_runner', 'Failed to chroot to ' + config.apphome, LOG_STDERR);
  pre_shutdown();
  process.exit(1);
}
var ch_uid = daemon.setreuid(config.userid);
if (ch_uid !== true) {
  log_line.call('chroot_runner', 'Failed to change user to ' + config.userid, LOG_STDERR);
  pre_shutdown();
  process.exit(2);
}

var child = null;
var child_watcher_time = null;
var log_lines = [];
var myPid = daemon.start();
(function () {

  var log_listen = function (p, cb) {
      var srv = net.createServer(function (conn) {
        var logs = JSON.stringify({
          logs: log_lines.join('\n')
        });
        conn.write(logs);
        conn.end();
      });
      srv.listen(p, cb);
    };

  var log_line = function (line, stdout) {
      if (typeof this == 'string') {
        line = this + line;
      }
      log_lines.push(line);
      if (log_lines.length > 150) log_lines.shift();
    };

  log_line.call('chroot_runner', 'New PID: ' + myPid.toString());
  if (path.existsSync('/.nodester/pids/runner.pid')) fs.unlinkSync('/.nodester/pids/runner.pid');
  fs.writeFileSync('/.nodester/pids/runner.pid', myPid.toString());

  var log_sock_path = path.join('/', '.nodester', 'logs.sock');
  log_listen(log_sock_path, function () {
    log_line('chroot_runner', 'log_listen\'ing', LOG_STDERR);
    try {
      fs.chmodSync(log_sock_path, '0777');
    } catch (e) {
      log_line('chroot_runner', 'Failed to chmod logs.sock', LOG_STDERR);
    }
    process.on('SIGINT', function () {
      log_line.call('chroot_runner', 'SIGINT recieved, sending SIGTERM to children.');
      if (child !== null) {
        log_line.call('chroot_runner', 'Child PID: ' + child.pid.toString());
        process.kill(child.pid, 'SIGTERM');
        process.exit();
      } else {
        process.exit();
      }
    });

    process.on('SIGTERM', function () {
      log_line.call('chroot_runner', 'SIGTERM recieved, sending SIGTERM to children.');
      if (child !== null) {
        log_line.call('chroot_runner', 'Child PID: ' + child.pid.toString());
        process.kill(child.pid, 'SIGTERM');
        process.exit();
      } else {
        process.exit();
      }
    });

    var start_child = function () {
      var pack = {};
      // normalize path, since args contain the node-executable pop that value
      // and replace it with `package.json`
      // I'm not a RegExp guru so this is my solution ;)
      var packPath = args[0].split('/');
      packPath[packPath.length-1] = 'package.json';
      packPath = packPath.join('/');
      // we don't know what kind of package.json are we dealing with
      try {
        pack =  JSON.parse(fs.readFileSync(packPath, 'utf8'));
      } catch(e){ 
        // Set default to the parent node version
        pack['node'] = process.version;
      }
      // What if the try/catch read the package but there is no `node`?
      var version = pack['node'] === undefined ? process.version : pack['node']; 
      // n dir only handles number paths without v0.x.x  => 0.x.x
      version = version.replace('v','').trim();
      if (node_versions.indexOf(version) !== -1) {
        // The spawn process only works with absolute paths, and by default n'd saved every
        // version of node in /usr/local/n/version
        child = spawn((path.extname(args[0]) == '.coffee'
                        ? '/usr/bin/coffee'
                        : '/usr/local/n/versions/' + version +'/bin/node'), args, {
          env: env
        });
        log_line.call('Watcher', 'Running node v-' + version, LOG_STDERR);
        child.stdout.on('data', log_line.bind('stdout'));
        child.stderr.on('data', log_line.bind('stderr'));
        child.on('exit', function (code) {
          if (code > 0 && run_count > run_max) {
            log_line.call('Watcher', 'Error: Restarted too many times, bailing.', LOG_STDERR);
            clearInterval(child_watcher_timer);
          } else if (code > 0) {
            log_line.call('Watcher', 'Process died with exit code ' + code + '. Restarting...', LOG_STDERR);
            child = null;
          } else {
            log_line.call('Watcher', 'Process exited cleanly. Dieing.', LOG_STDERR);
            clearInterval(child_watcher_timer);
          }
        });
      } else {
        log_line.call('Watcher', 'Process exited cleanly. node.js Version:'+version + ' not avaiable', LOG_STDERR);
        clearInterval(child_watcher_timer);
      }
    };
    var child_watcher = function () {
        if (child === null) {
          start_child();
          run_count++;
        }
      };
    child_watcher_timer = setInterval(child_watcher, 750);
  });
})();
