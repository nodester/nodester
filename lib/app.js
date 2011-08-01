var config = require('../config'),
    fs = require('fs'),
    path = require('path'),
    cradle = require('cradle'),
    lib = require('./lib'),
    unionfs = require('./unionfs').unionfs,
    chroot = require('./chroot').chroot,
    spawn = require('child_process').spawn,
    exec = require('child_process').exec;


module.exports = {
  logs: function(req, res, next) {
    var appname = req.appname;
    var user = req.user;
    var app = req.app;
    var app_error_log_sock = path.join(config.opt.apps_home_dir, app.username, app.repo_id + '_chroot', '.nodester', 'logs.sock');
    console.log('Attempting to connect to: ' + app_error_log_sock);
    var net = require('net');
    var app_handler = net.createConnection(app_error_log_sock);
    var timer = setTimeout(function () {
      res.writeHead(500, {
        'Content-Type': 'application/json'
      });
      res.end(JSON.stringify({
        success: false,
        error: 'Timeout getting logs.'
      }) + '\n');
      app_handler.end();
    }, 5000);
    app_handler.once('connect', function () {
      var buff = '';
      app_handler.on('data', function (data) {
        buff += data.toString();
      });
      app_handler.once('end', function () {
        clearTimeout(timer);
        try {
          var logs_strs = JSON.parse(buff);
          var lines = logs_strs['logs'].split('\n');
        } catch (e) {
          var lines = 'Error parsing lines.';
        }
        res.writeHead(200, {
          'Content-Type': 'application/json'
        });
        res.end(JSON.stringify({
          success: true,
          lines: lines
        }) + '\n');
      });
    });
  },
  gitreset: function(req, res, next) {
    var appname = req.param("appname").toLowerCase();
    var user = req.user;
    var app = req.app;
    var apps = lib.get_couchdb_database('apps');
    apps.get(appname, function(err, doc) {
      if (err) {
        res.writeHead(500, {
          'Content-Type': 'application/json'
        });
        res.end(JSON.stringify({
          status: "failure",
          message: err.error + ' - ' + err.reason
        }) + '\n');
      } else {
        console.log('Resetting repo from git: ', app.repo_id);
        var app_user_home = path.join(config.opt.git_home_dir, app.username, app.repo_id);
        exec(config.opt.app_dir + '/scripts/gitreset.js ' + app_user_home, function() {
          app_restart(app.repo_id, function() {
            res.writeHead(200, {
              'Content-Type': 'application/json'
            });
            res.end(JSON.stringify({
              status: "success"
            }));
          });
        });
      }
    });
  },
  delete: function(req, res, next) {
    var appname = req.param("appname").toLowerCase();
    var user = req.user;
    var app = req.app;
    var apps = lib.get_couchdb_database('apps');
    apps.get(appname, function(err, doc) {
      var app_user_home = path.join(config.opt.apps_home_dir, app.username, app.repo_id);
      var app_git_home = path.join(config.opt.git_home_dir, app.username, app.repo_id);
      if (err) {
        res.writeHead(200, {
          'Content-Type': 'application/json'
        });
        res.end(JSON.stringify({
          status: "failure",
          message: err.error + ' - ' + err.reason
        }) + '\n');
      } else {
        apps.remove(appname, doc._rev, function(err, resp) {
          if (err) {
            res.writeHead(200, {
              'Content-Type': 'application/json'
            });
            res.end(JSON.stringify({
              status: "failure",
              message: err.error + ' - ' + err.reason
            }) + '\n');
          } else {
            var app_rw = app_user_home + '_rw';
            var app_chroot = app_user_home + '_chroot';
            lib.tear_down_unionfs_chroot(config.opt.node_base_folder, app_user_home, app_rw, app_chroot, function() {
              lib.update_proxytable_map(function(err) {
                app_stop(app.repo_id, function() {
                  exec('sudo ' + config.opt.app_dir + '/scripts/removeapp.js ' + app_user_home + ' ' + app_git_home, function() {
                  });
                });
              });
            });
            res.writeHead(200, {
              'Content-Type': 'application/json'
            });
            res.end(JSON.stringify({
              "status": "success"
            }));
          }
        });
      }
    });
  },
  put: function(req, res, next) {
    var appname = req.body.appname.toLowerCase();
    var user = req.user;
    var app = req.app;
    var db = lib.get_couchdb_database('apps');
    db.get(appname, function(err, appdoc) {
      if (err) {
        res.writeHead(500, {
          'Content-Type': 'application/json'
        });
        res.end(JSON.stringify({
          status: "failure",
          message: err.error + ' - ' + err.reason
        }) + '\n');
      } else {
        var start = req.body.start;
        var app_user_home = path.join(config.opt.apps_home_dir, appdoc.username);
        var app_home = path.join(app_user_home, appdoc.repo_id);
        var app_repo = config.opt.git_user + '@' + config.opt.git_dom + ':' + path.join(config.opt.git_home_dir, appdoc.username, appdoc.repo_id + '.git');
        if (typeof start != 'undefined' && start.length > 0) {
          db.merge(appname, {
            start: start
          }, function(err, resp) {
            res.writeHead(200, {
              'Content-Type': 'application/json'
            });
            res.end(JSON.stringify({
              status: success,
              port: appdoc.port,
              gitrepo: app_repo,
              start: start,
              running: appdoc.running,
              pid: appdoc.pid
            }));
          });
        } else {
          var running = req.body.running;
          switch (running) {
          case "true":
            if (appdoc.running == "true") {
              res.writeHead(408, {
                'Content-Type': 'application/json'
              });
              res.end(JSON.stringify({status: "failure - application already running."}));
            } else {
              app_start(appdoc.repo_id, function(rv, pid) {
                var success = "false",
                    running = "failed-to-start";
                if (rv === true) {
                  success = "success";
                  running = "true";
                  lib.update_proxytable_map(function(err) {
                    // Not sure if the user needs to be made aware in case of these errors. Admins should be though.
                  });
                }
                db.merge(appname, {
                  running: running,
                  pid: pid
                }, function(err, resp) {
                  res.writeHead(200, {
                    'Content-Type': 'application/json'
                  });
                  res.end(JSON.stringify({
                    status: success,
                    port: appdoc.port,
                    gitrepo: app_repo,
                    start: appdoc.start,
                    running: running,
                    pid: pid
                  }));
                });
              });
            }
            break;
          case "restart":
            app_restart(app.repo_id, function(rv, pid) {
              var success = "false",
                  running = "failed-to-restart";
              if (rv === true) {
                success = "success";
                running = "true";
              }
              db.merge(appname, {
                running: running,
                pid: pid
              }, function(err, resp) {
                res.writeHead(200, {
                  'Content-Type': 'application/json'
                });
                res.end(JSON.stringify({
                  status: success,
                  port: appdoc.port,
                  gitrepo: app_repo,
                  start: appdoc.start,
                  running: running,
                  pid: pid
                }));
              });
            });
            break;
          case "false":
            if (app.running != 'true') {
              res.writeHead(408, {
                'Content-Type': 'application/json'
              });
              res.end(JSON.stringify({status: "failure - application already stopped."}));
            } else {
              app_stop(app.repo_id, function(rv) {
                var success = "false",
                    running = "failed-to-stop";
                if (rv === true) {
                  success = "success";
                  running = "false";
                  lib.update_proxytable_map(function(err) {
                    // Not sure if the user needs to be made aware in case of these errors. Admins should be though.
                  });
                }
                db.merge(appname, {
                  running: running,
                  pid: 'unknown'
                }, function(err, resp) {
                  res.writeHead(200, {
                    'Content-Type': 'application/json'
                  });
                  res.end(JSON.stringify({
                    status: success,
                    port: appdoc.port,
                    gitrepo: app_repo,
                    start: appdoc.start,
                    running: running,
                    pid: 'unknown'
                  }));
                });
              });
            }
            break;
          default:
            res.writeHead(400, {
              'Content-Type': 'application/json'
            });
            res.end(JSON.stringify({
              status: "false",
              message: "Invalid action."
            }) + "\n");
            break;
          }
        }
      }
    });
  },
  app_start: function(req, res, next) {
    var repo_id = req.query.repo_id;
    var restart_key = req.query.restart_key;
    if (restart_key != config.opt.restart_key) {
      res.writeHead(403, {
        'Content-Type': 'application/json'
      });
      res.end();
      return;
    } else {
      app_start(repo_id, function(rv) {
        if (rv === false) {
          res.writeHead(200, {
            'Content-Type': 'application/json'
          });
          res.end(JSON.stringify({
            status: "failed to start"
          }));
        } else {
          res.writeHead(200, {
            'Content-Type': 'application/json'
          });
          res.end(JSON.stringify({
            status: "started"
          }));
        }
      }, true);
    }
  },
  app_stop: function(req, res, next) {
    var repo_id = req.query.repo_id;
    var restart_key = req.query.restart_key;
    if (restart_key != config.opt.restart_key) {
      res.writeHead(403, {
        'Content-Type': 'application/json'
      });
      res.end();
      return;
    } else {
      app_stop(repo_id, function(rv) {
        if (rv === false) {
          res.writeHead(200, {
            'Content-Type': 'application/json'
          });
          res.end(JSON.stringify({
            status: "failed to stop"
          }));
        } else {
          res.writeHead(200, {
            'Content-Type': 'application/json'
          });
          res.end(JSON.stringify({
            status: "stop"
          }));
        }
      });
    }
  },
  app_restart: function(req, res, next) {
    var repo_id = req.query.repo_id;
    var restart_key = req.query.restart_key;
    if (restart_key != config.opt.restart_key) {
      res.writeHead(403, {
        'Content-Type': 'application/json'
      });
      res.end();
      return;
    } else {
      app_restart(repo_id, function(rv) {
        if (rv === false) {
          res.writeHead(200, {
            'Content-Type': 'application/json'
          });
          res.end(JSON.stringify({
            status: "failed to restart"
          }));
        } else {
          res.writeHead(200, {
            'Content-Type': 'application/json'
          });
          res.end(JSON.stringify({
            status: "restarted"
          }));
        }
      }, true);
    }
  },
  get: function(req, res, next) {
    res.writeHead(200, {
      'Content-Type': 'application/json'
    });
    res.end(JSON.stringify({
      status: "success",
      port: req.app.port,
      gitrepo: config.opt.git_user + '@' + config.opt.git_dom + ':' + path.join(config.opt.git_home_dir, req.app.username, req.app.repo_id + '.git'),
      start: req.app.start,
      running: req.app.running,
      pid: req.app.pid
    }));
  },
  post: function(req, res, next) {
    var appname = req.body.appname;
    var start = req.body.start;
    if (!appname) {
      res.writeHead(200, {
        'Content-Type': 'application/json'
      });
      res.end(JSON.stringify({
        status: "failure",
        message: "Appname Required"
      }));
      return;
    }
    if (!start) {
      res.writeHead(200, {
        'Content-Type': 'application/json'
      });
      res.end(JSON.stringify({
        status: "failure",
        message: "Start File Required"
      }));
      return;
    }
    var user = req.user;
    var apps = lib.get_couchdb_database('apps');
    apps.get(appname, function(err, doc) {
      if (err) {
        if (err.error == 'not_found') {
          var nextport = lib.get_couchdb_database('nextport');
          nextport.get('port', function(err, next_port) {
            if (err) {
              res.writeHead(500, {
                'Content-Type': 'application/json'
              });
              res.end(JSON.stringify({
                status: "failure",
                message: err.error + ' - ' + err.reason
              }) + '\n');
            } else {
              var appport = next_port.address;
              var repo_id = next_port._rev;
              nextport.merge('port', {
                address: appport + 1
              }, function(err, resp) {
                if (err) {
                  res.writeHead(500, {
                    'Content-Type': 'application/json'
                  });
                  res.end(JSON.stringify({
                    status: "failure",
                    message: err.error + ' - ' + err.reason
                  }) + '\n');
                } else {
                  apps.save(appname, {
                    start: start,
                    port: appport,
                    username: user._id,
                    repo_id: repo_id,
                    running: false,
                    pid: 'unknown',
                    env: {}
                  }, function(err, resp) {
                    if (err) {
                      res.writeHead(500, {
                        'Content-Type': 'application/json'
                      });
                      res.end(JSON.stringify({
                        status: "failure",
                        message: err.error + ' - ' + err.reason
                      }) + '\n');
                    } else {
                      var repos = lib.get_couchdb_database('repos');
                      repos.save(repo_id, {
                        appname: appname,
                        username: user._id
                      }, function(err, resp) {
                        if (err) {
                          res.writeHead(500, {
                            'Content-Type': 'application/json'
                          });
                          res.end(JSON.stringify({
                            status: "failure",
                            message: err.error + ' - ' + err.reason
                          }) + '\n');
                        } else {
                          var cmd = 'sudo ' + config.opt.app_dir + '/scripts/gitreposetup.sh ' + [config.opt.app_dir, config.opt.git_home_dir, user._id, repo_id, start, config.opt.userid, config.opt.git_user, config.opt.apps_home_dir].join(' ');
                          console.log('gitsetup cmd: %s', cmd);
                          exec(cmd, function(err, stdout, stderr) {
                            if (err) console.error('gitsetup error: %s', err);
                            if (stdout.length > 0) console.log('gitsetup stdout: %s', stdout);
                            if (stderr.length > 0) console.error('gitsetup stderr: %s', stderr);
                          });
                          // var gitsetup = spawn('/usr/bin/env sudo ' + config.opt.app_dir + '/scripts/gitreposetup.sh', [config.opt.app_dir, config.opt.git_home_dir, user._id, repo_id, start, config.opt.userid, config.opt.git_user]);
                          //Added logging to the reposetup script
                          // gitsetup.stdout.on('data', function (data) {
                          //  console.log('git setup stdout: ' + data);
                          //});
                          // gitsetup.stderr.on('data', function (data) {
                          //  console.error('git setup stderr: ' + data);
                          //});
                          // Respond to API request
                          res.writeHead(200, {
                            'Content-Type': 'application/json'
                          });
                          res.end(JSON.stringify({
                            status: "success",
                            port: appport,
                            gitrepo: config.opt.git_user + '@' + config.opt.git_dom + ':' + path.join(config.opt.git_home_dir, user._id, repo_id + '.git'),
                            start: start,
                            running: false,
                            pid: "unknown"
                          }));
                          lib.update_proxytable_map(function(err) {
                            // Not sure if the user needs to be made aware in case of these errors. Admins should be though.
                          });
                        }
                      });
                    }
                  });
                }
              });
            }
          });
        } else {
          res.writeHead(500, {
            'Content-Type': 'application/json'
          });
          res.end(JSON.stringify({
            status: "failure",
            message: err.error + ' - ' + err.reason
          }) + '\n');
        }
      } else {
        res.writeHead(200, {
          'Content-Type': 'application/json'
        });
        res.end(JSON.stringify({
          status: "failure",
          message: "app exists"
        }));
      }
    });
  },
  env_get: function(req, res, next) {
    var appname = req.body.appname.toLowerCase();
    var db = lib.get_couchdb_database('apps');
    db.get(appname, function(err, appdoc) {
      if (err) {
        res.writeHead(500, {
          'Content-Type': 'application/json'
        });
        res.end(JSON.stringify({
          status: "failure",
          message: err.error + ' - ' + err.reason
        }) + '\n');
      } else {
        var start = req.body.start;
        db.get(appname, function(err, doc) {
          if (err) {
            res.writeHead(500, {
              'Content-Type': 'application/json'
            });
            res.end(JSON.stringify({
              status: "failure",
              message: err.error + ' - ' + err.reason
            }) + '\n');
          } else {
            res.writeHead(200, {
              'Content-Type': 'application/json'
            });
            res.end(JSON.stringify({
              status: "success",
              message: doc.env || {}
            }));
          }
        });
      }
    });
  },
  env_put: function(req, res, next) {
    var appname = req.body.appname.toLowerCase();
    var db = lib.get_couchdb_database('apps');
    var key = req.body.key,
        value = req.body.value;
    if (!key || !value) {
      res.writeHead(400, {
        'Content-Type': 'application/json'
      });
      res.end(JSON.stringify({
        status: "false",
        message: "Must specify both key and value."
      }) + "\n");
      return;
    }
    db.get(appname, function(err, appdoc) {
      if (err) {
        res.writeHead(500, {
          'Content-Type': 'application/json'
        });
        res.end(JSON.stringify({
          status: "failure",
          message: err.error + ' - ' + err.reason
        }) + '\n');
      } else {
        env_update(res, db, appname, appdoc, key, value);
      }
    });
  },
  env_delete: function(req, res, next) {
    var appname = req.body.appname.toLowerCase();
    var db = lib.get_couchdb_database('apps');
    var key = req.body.key;
    if (!key) {
      res.writeHead(400, {
        'Content-Type': 'application/json'
      });
      res.end(JSON.stringify({
        status: "false",
        message: "Must specify key."
      }) + "\n");
      return;
    }
    db.get(appname, function(err, appdoc) {
      if (err) {
        res.writeHead(500, {
          'Content-Type': 'application/json'
        });
        res.end(JSON.stringify({
          status: "failure",
          message: err.error + ' - ' + err.reason
        }) + '\n');
      } else {
        env_update(res, db, appname, appdoc, key, undefined);
      }
    });
  }
};

var env_update = function(res, db, appname, appdoc, key, value) {
  var env = {};
  if (appdoc.env) {
    Object.keys(appdoc.env).forEach(function(k) {
      env[k] = appdoc.env[k];
    });
  }
  if (value !== undefined) {
    env[key] = value;
  } else {
    delete env[key];
  }
  db.merge(appname, {
    env: env
  }, function(err, resp) {
    if (err) {
      res.writeHead(500, {
        'Content-Type': 'application/json'
      });
      res.end(JSON.stringify({
        status: "failure",
        message: err.error + ' - ' + err.reason
      }) + '\n');
    } else {
      res.writeHead(200, {
        'Content-Type': 'application/json'
      });
      res.end(JSON.stringify({
        status: "success",
        message: value === undefined ? ("DELETE " + key) : (key + "=" + value)
      }));
    }
  });
};

var force_stop = function(repo_id, callback) {
  console.log('Forcing stop for: ', repo_id);
  console.log("ps aux | awk '/" + repo_id + "/ && !/awk |curl / {print $2}'");
  exec("ps aux | awk '/" + repo_id + "/ && !/awk |curl / {print $2}'", function(err, pid) {
    if (err) {
      callback(false);
      return;
    }
    try {
      console.log('PID: "' + pid + '"');
      if (pid.length > 0) {
        var pids = pid.split('\n'),
            k = false;

        var p = typeof pids[0] != 'undefined' ? parseInt(pids[0], 10) : 0;
        console.log('p: "' + p + '"');
        if (p > 0) {
          console.log('Sending SIGKILL to ', p);
          process.kill(p, 'SIGKILL');
          k = true;
        }
        callback(k);
      } else {
        callback(true);
      }

    } catch (e) {
      callback(false);
    }
  });
};


var app_stop = function(repo_id, callback, skip_unmount) {
  var db = lib.get_couchdb_database('repos');
  db.get(repo_id, function(err, doc) {
    if (err) {
      callback(false);
    } else {
      var app_home = path.join(config.opt.apps_home_dir, doc.username, doc._id);
      fs.readFile(path.join(app_home + '_rw', '.nodester', 'pids', 'runner.pid'), function(err, data) {
        if (err) {
          callback(false);
        } else {
          var pid = parseInt(data.toString(), 10);
          if (pid > 0) {
            try {
              process.kill(pid, 'SIGINT');
              var app_home = path.join(config.opt.apps_home_dir, doc.username, repo_id);
              var app_rw = app_home + '_rw';
              var app_chroot = app_home + '_chroot';
              if (typeof skip_unmount == 'undefined' || skip_unmount !== true) lib.tear_down_unionfs_chroot(config.opt.node_base_folder, app_home, app_rw, app_chroot, function() {});
            } catch (e) {
              // Blah
            }
            callback(true);
          } else {
            callback(false);
          }
        }
      });
    }
  });
};

var app_start = function(repo_id, callback) {
  var db = lib.get_couchdb_database('repos');
  db.get(repo_id, function(err, doc) {
    if (err) {
      callback(false);
    } else {
      var user_home = path.join(config.opt.apps_home_dir, doc.username);
      var app_home = user_home + '/' + repo_id;
      var apps = lib.get_couchdb_database('apps');
      apps.get(doc.appname, function(err, app) {
        if (err) {
          callback(false);
        } else {
          var configData = {
            appdir: config.opt.app_dir,
            userid: config.opt.app_uid,
            chroot_base: config.opt.node_base_folder,
            apphome: app_home,
            apprwfolder: path.join(app_home, '..', repo_id + '_rw'),
            appchroot: path.join(app_home, '..', repo_id + '_chroot'),
            start: app.start,
            port: app.port,
            ip: '127.0.0.1',
            name: doc.appname,
            env: app.env || {}
          };
          console.log('Checking: ', configData.apphome);
          if (!path.existsSync(configData.apphome)) {
            //Bad install??
            console.log('App directory does not exist: ', apphome);
            callback(false);
            return;
          }
          console.log('Checking: ', path.join(configData.apphome, app.start));
          if (!path.existsSync(path.join(configData.apphome, app.start))) {
            //Bad install??
            console.log('App start file does not exist: ', path.join(configData.apphome, app.start));
            callback(false);
            return;
          }

          console.log('Checking: ', path.join(configData.apprwfolder, '.nodester'));
          if (!path.existsSync(path.join(configData.apprwfolder, '.nodester'))) {
            console.log('Making Directories..');
            if (!path.existsSync(configData.apprwfolder)) fs.mkdirSync(configData.apprwfolder, '0777');
            fs.mkdirSync(path.join(configData.apprwfolder, 'app'), '0777');
            fs.mkdirSync(path.join(configData.apprwfolder, '.nodester'), '0777');
            fs.mkdirSync(path.join(configData.apprwfolder, '.nodester', 'logs'), '0777');
            fs.mkdirSync(path.join(configData.apprwfolder, '.nodester', 'pids'), '0777');
          }
          try {
            fs.chmodSync(path.join(configData.apprwfolder, 'app'), '0777');
          } catch (e) {
            console.log('Failed to chmod %s/%s 0777', configData.apprwfolder, 'app');
          }
          console.log('Writing config data: ', path.join(configData.apprwfolder, '.nodester', 'config.json'));
          fs.writeFileSync(path.join(configData.apprwfolder, '.nodester', 'config.json'), JSON.stringify(configData), encoding = 'utf8'); // TODO Change to ASYNC
          lib.tear_down_unionfs_chroot(configData.chroot_base, configData.apphome, configData.apprwfolder, configData.appchroot, function(resp) {
            lib.setup_unionfs_chroot(configData.chroot_base, configData.apphome, configData.apprwfolder, configData.appchroot, function(resp) {
              if (resp === true) {
                var cmd = 'cd ' + configData.appchroot + ' && ulimit -c unlimited -n 65000 -u 100000 -i 1000000 -l 10240 -s 102400 && sudo ' + path.join(config.opt.app_dir, 'scripts', 'chroot_runner.js');
                console.log(cmd);
                exec(cmd, function(error, stdout, stderr) {
                  if (stdout) {
                    console.log(stdout);
                  }
                  if (stderr) {
                    console.log(stderr);
                  }
                  setTimeout(function() {
                    var tapp = {
                      pid: 'unknown',
                      running: 'failed-to-start'
                    };
                    fs.readFile(path.join(configData.apprwfolder, '.nodester', 'pids', 'runner.pid'), function(err, pids) {
                      var pid = parseInt(pids, 10);
                      if (pid > 0) {
                        tapp.pid = pid;
                        tapp.running = 'true';
                      }
                      apps.merge(doc.appname, tapp, function() {
                        callback(true, pid);
                      });
                    });
                  }, 1000);
                });
              }
            });
          });
        }
      });
    }
  });
};

var app_restart = function(repo_id, callback) {
  app_stop(repo_id, function(rv) {
    setTimeout(function() {
      app_start(repo_id, function(rv, pid) {
        if (rv === false) {
          callback(false);
        } else {
          callback(true, pid);
        }
      });
    }, 1000);
  }, true);
};
