var config = require('../config'),
    fs = require('fs'),
    path = require('path'),
    cradle = require('cradle'),
    lib = require('./lib'),
    spawn = require('child_process').spawn,
    exec = require('child_process').exec;
    

module.exports = {
  logs: function(req, res, next) {
    var appname = req.appname;
    var user = req.user;
    var app = req.app;
    var app_user_home = path.join(config.opt.apps_home_dir, user._id, app.repo_id);
    fs.readFile(app_user_home + '/error.log', function (err, body) {
      var code = 200, resp;
      if (err) {
        code = 500;
        resp = {success: false, error: "Failed to read error log."};
      } else {
        var lines = body.toString().split("\n");
        lines = lines.slice(-100);
        resp = {success: true, lines: lines};
      }
      res.writeHead(code, {'Content-Type': 'application/json'});
      res.write(JSON.stringify(resp) + '\n');
      res.end();
    });
  },
  gitreset: function(req, res, next) {
    var appname = req.param("appname").toLowerCase();
    var user = req.user;
    var app = req.app;
    var apps = lib.get_couchdb_database('apps');
    apps.get(appname, function (err, doc) {
        if (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({status: "failure", message: err.error + ' - ' + err.reason}) + '\n');
        } else {
            console.log('Resetting repo from git: ', app.repo_id);
            var app_user_home = path.join(config.opt.git_home_dir, user._id, app.repo_id);
            exec(config.opt.app_dir + '/scripts/gitreset.js ' + app_user_home, function () {
              app_restart(app.repo_id, function() {
                  res.send({
                      status: "success"
                  });
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
    apps.get(appname, function (err, doc) {
        var app_user_home = path.join(config.opt.git_home_dir, user._id, app.repo_id);
        if (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({status: "failure", message: err.error + ' - ' + err.reason}) + '\n');
        } else {
            apps.remove(appname, doc._rev, function (err, resp) {
                if (err) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({status: "failure", message: err.error + ' - ' + err.reason}) + '\n');
                } else {
                    lib.update_proxytable_map(function (err) {
                        app_stop(app.repo_id, function() {
                          exec(config.opt.app_dir + '/scripts/removeapp.js ' + app_user_home, function () {
                            res.send({ "status" : "success" });
                          });
                        });
                    });
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
    db.get(appname, function (err, appdoc) {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({status: "failure", message: err.error + ' - ' + err.reason}) + '\n');
      } else {
        var start = req.body.start;
        var app_user_home = path.join(config.opt.apps_home_dir, appdoc.username);
        var app_home = path.join(app_user_home, appdoc.repo_id);
        var app_repo = config.opt.git_user + '@' + config.opt.git_dom + ':' + path.join(config.opt.git_home_dir, appdoc.username, appdoc.repo_id + '.git');
        if (typeof start != 'undefined' && start.length > 0) {
          db.merge(appname, {start: start}, function (err, resp) {
            res.send({ status: success,
              port: appdoc.port,
              gitrepo: app_repo,
              start: start,
              running: appdoc.running,
              pid: appdoc.pid
            });
          });
        } else {
          var running = req.body.running;
          switch (running) {
            case "true":
              if (appdoc.running == "true") {
                res.error(res, 408, "failure - application already running.");
              } else {
                app_start(appdoc.repo_id, function (rv, pid) {
                  var success = "false",
                      running = "failed-to-start";
                  if (rv == true) {
                    success = "success";
                    running = "true";
                    lib.update_proxytable_map(function (err) {
                      // Not sure if the user needs to be made aware in case of these errors. Admins should be though.
                    });
                  }
                  db.merge(appname, {running: running, pid: pid }, function (err, resp) {
                    res.send({
                      status: success,
                      port: appdoc.port,
                      gitrepo: app_repo,
                      start: appdoc.start,
                      running: running,
                      pid: pid
                    });
                  });
                });
              }
              break;
            case "restart":
              app_restart(app.repo_id, function (rv, pid) {
                var success = "false",
                    running = "failed-to-restart";
                if (rv == true) {
                  success = "success";
                  running = "true";
                }
                db.merge(appname, {running: running, pid: pid }, function (err, resp) {
                  res.send({
                    status: success,
                    port: appdoc.port,
                    gitrepo: app_repo,
                    start: appdoc.start,
                    running: running,
                    pid: pid
                  });
                });
              });
              break;
            case "false":
              if (app.running == 'false') {
                res.error(res, 408, "failure - application already stopped.");
              } else {
                app_stop(app.repo_id, function (rv) {
                  var success = "false",
                      running = "failed-to-stop";
                  if (rv == true) {
                    success = "success";
                    running = "false";
                    lib.update_proxytable_map(function (err) {
                      // Not sure if the user needs to be made aware in case of these errors. Admins should be though.
                    });
                  }
                  db.merge(appname, {running: running, pid: 'unknown' }, function (err, resp) {
                    res.send({
                      status: success,
                      port: appdoc.port,
                      gitrepo: app_repo,
                      start: appdoc.start,
                      running: running,
                      pid: 'unknown'
                    });
                  });
                });
              }
              break;
            default:
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.write(JSON.stringify({status: "false", message: "Invalid action."}) + "\n");
              res.end();
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
      res.send(403);
      return;
    } else {
      app_start(repo_id, function(rv) {
        if (rv == false) {
          res.send({ status: "failed to start" });
        } else {
          res.send({ status: "started" });
        }
      }, true);
    }
  },
  app_stop: function(req, res, next) {
    var repo_id = req.query.repo_id;
    var restart_key = req.query.restart_key;
    if (restart_key != config.opt.restart_key) {
      res.send(403);
      return;
    } else {
      app_stop(repo_id, function(rv) {
        if (rv == false) {
          res.send({ status: "failed to stop" });
        } else {
          res.send({ status: "stop" });
        }
      }, true);
    }
  },
  app_restart: function(req, res, next) {
    var repo_id = req.query.repo_id;
    var restart_key = req.query.restart_key;
    if (restart_key != config.opt.restart_key) {
      res.send(403);
      return;
    } else {
      app_restart(repo_id, function(rv) {
        if (rv == false) {
          res.send({ status: "failed to restart" });
        } else {
          res.send({ status: "restarted" });
        }
      }, true);
    }
  },
  get: function(req, res, next) {
    res.send({
      status: "success",
      port: req.app.port,
      gitrepo: config.opt.git_user + '@' + config.opt.git_dom + ':' + path.join(config.opt.git_home_dir, req.app.username, req.app.repo_id + '.git'),
      start: req.app.start,
      running: req.app.running,
      pid: req.app.pid
    });
  },
  post: function(req, res, next) {
      var appname = req.body.appname;
      var start = req.body.start;
      if (!appname) {
            res.send({
                status: "failure",
                message: "Appname Required"
            });
            return;
      }
      if (!start) {
            res.send({
                status: "failure",
                message: "Start File Required"
            });
            return;
      }
      var user = req.user;
      var apps = lib.get_couchdb_database('apps');
      apps.get(appname, function (err, doc) {
        if (err) {
          if (err.error == 'not_found') {
            var nextport = lib.get_couchdb_database('nextport');
            nextport.get('port', function (err, next_port) {
                if (err) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({status: "failure", message: err.error + ' - ' + err.reason}) + '\n');
                } else {
                    var appport = next_port.address;
                    var repo_id = next_port._rev;
                    nextport.merge('port', {address: appport + 1}, function (err, resp) {
                        if (err) {
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({status: "failure", message: err.error + ' - ' + err.reason}) + '\n');
                        } else {
                            apps.save(appname, {
                                start: start,
                                port: appport,
                                username: user._id,
                                repo_id: repo_id,
                                running: false,
                                pid: 'unknown',
                                env: {}
                            }, function (err, resp) {
                                if (err) {
                                    res.writeHead(500, { 'Content-Type': 'application/json' });
                                    res.end(JSON.stringify({status: "failure", message: err.error + ' - ' + err.reason}) + '\n');
                                } else {
                                    var repos = lib.get_couchdb_database('repos');
                                    repos.save(repo_id, {appname: appname, username: user._id}, function (err, resp) {
                                      if (err) {
                                          res.writeHead(500, { 'Content-Type': 'application/json' });
                                          res.end(JSON.stringify({status: "failure", message: err.error + ' - ' + err.reason}) + '\n');
                                      } else {
                                            var cmd = 'sudo ' + config.opt.app_dir + '/scripts/gitreposetup.sh ' + [config.opt.app_dir, config.opt.git_home_dir, user._id, repo_id, start, config.opt.userid, config.opt.git_user, config.opt.apps_home_dir].join(' ');
                                            console.log('gitsetup cmd: %s', cmd);
                                            exec(cmd, function (err, stdout, stderr) {
                                              if (err) console.error('gitsetup error: %s', err);
                                              if (stdout.length > 0) console.log('gitsetup stdout: %s', stdout);
                                              if (stderr.length > 0) console.error('gitsetup stderr: %s', stderr)
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
                                          res.send({ status: "success",
                                              port: appport,
                                              gitrepo: config.opt.git_user + '@' + config.opt.git_dom + ':' + path.join(config.opt.git_home_dir, user._id, repo_id + '.git'),
                                              start: start,
                                              running: false,
                                              pid: "unknown"
                                          });
                                          lib.update_proxytable_map(function (err) {
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
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({status: "failure", message: err.error + ' - ' + err.reason}) + '\n');
          }
        } else {
          res.send({status: "failure", message: "app exists"});
        }
      });
  },
  env_get: function(req, res, next) {
    var appname = req.body.appname.toLowerCase();
    var db = lib.get_couchdb_database('apps');
    db.get(appname, function (err, appdoc) {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({status: "failure", message: err.error + ' - ' + err.reason}) + '\n');
      } else {
        var start = req.body.start;
        db.get(appname, function (err, doc) {
          if (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({status: "failure", message: err.error + ' - ' + err.reason}) + '\n');
          } else {
            res.send({status: "success", message: doc.env || {}});
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
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.write(JSON.stringify({status: "false", message: "Must specify both key and value."}) + "\n");
      res.end();
      return;
    }
    db.get(appname, function (err, appdoc) {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({status: "failure", message: err.error + ' - ' + err.reason}) + '\n');
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
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.write(JSON.stringify({status: "false", message: "Must specify key."}) + "\n");
      res.end();
      return;
    }
    db.get(appname, function (err, appdoc) {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({status: "failure", message: err.error + ' - ' + err.reason}) + '\n');
      } else {
        env_update(res, db, appname, appdoc, key, undefined);
      }
    });
  }
}

var env_update = function(res, db, appname, appdoc, key, value) {
  var env = {};
  if (appdoc.env) {
    Object.keys(appdoc.env).forEach(function (k) {
      env[k] = appdoc.env[k];
    });
  }
  if (value !== undefined) {
    env[key] = value;
  } else {
    delete env[key];
  }
  db.merge(appname, {env: env}, function(err, resp) {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({status: "failure", message: err.error + ' - ' + err.reason}) + '\n');
    } else {
      res.send({status: "success", message: value === undefined ? ("DELETE " + key) : (key + "=" + value)});
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
            
              var p = typeof pids[0] != 'undefined' ? parseInt(pids[0]) : 0;
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
}


var app_stop = function (repo_id, callback) {
    var db = lib.get_couchdb_database('repos');
    db.get(repo_id, function (err, doc) {
      if (err) {
        callback(false);
      } else {
        var app_home = path.join(config.opt.git_home_dir, doc.username, doc._id);
        fs.readFile(path.join(app_home, '.nodester', 'pids', 'app.pid'), function (err, data) {
            if (err) {
                force_stop(repo_id, callback);
            } else {
                try {
                    var p = parseInt(data.toString());
                    fs.unlink(path.join(app_home, '.nodester', 'pids', 'app.pid'));
                    if (p > 0) {
                        process.kill(p, 'SIGKILL');
                    } else {
                        force_stop(repo_id, callback);
                    }
                    callback(true);
                } catch (e) {
                    force_stop(repo_id, callback);
                }
            }
        });
      }
    });
};

var app_start = function (repo_id, callback) {
    var db = lib.get_couchdb_database('repos');
    db.get(repo_id, function (err, doc) {
      if (err) {
        callback(false);
      } else {
        var user_home = path.join(config.opt.apps_home_dir, doc.username);
        var app_home = user_home + '/' + repo_id;
        var apps = lib.get_couchdb_database('apps');
        apps.get(doc.appname, function (err, app) {
          if (err) {
            callback(false);
          } else {
            var configData = {
                appdir: config.opt.app_dir,
                userid: config.opt.app_uid,
                apphome: app_home,
                start: app.start,
                port: app.port,
                ip: '127.0.0.1',
                name: doc.appname,
                env: app.env || {}
            };
            console.log('Checking: ', app_home);
            if (!path.existsSync(app_home)) {
                //Bad install??
                console.log('App directory does not exist: ', app_home);
                callback(false);
                return;
            }
            console.log('Checking: ', path.join(app_home, app.start));
            if (!path.existsSync(path.join(app_home, app.start))) {
                //Bad install??
                console.log('App start file does not exist: ', path.join(app_home, app.start));
                callback(false);
                return;
            }
            
            console.log('Checking: ', path.join(app_home, '.nodester'));
            if (!path.existsSync(path.join(app_home, '.nodester'))) {
                console.log('Making Directories..');
                fs.mkdirSync(path.join(app_home, '.nodester'), 0777);
                fs.mkdirSync(path.join(app_home, '.nodester', 'logs'), 0777);
                fs.mkdirSync(path.join(app_home, '.nodester', 'pids'), 0777);
            }
            console.log('Writing config data: ', path.join(app_home, '.nodester', 'config.json'));
            fs.writeFileSync(path.join(app_home, '.nodester', 'config.json'), JSON.stringify(configData), encoding='utf8');
            //var cmd = "sudo " + path.join(config.opt.app_dir, 'scripts', 'launch_app.sh') + ' ' + config.opt.app_dir + ' ' + config.opt.userid + ' ' + app_home + ' ' + app.start + ' ' + app.port + ' ' + '127.0.0.1' + ' ' + doc.appname;
            var cmd = 'cd ' + app_home + ' && sudo ' + path.join(config.opt.app_dir, 'scripts', 'launch_chrooted_app.js') + ' "' + doc.username + '/' + repo_id + '/' + doc.appname + '/' + app.start + ':' + app.port + '"';
            console.log(cmd);
            exec(cmd, function (error, stdout, stderr) {
                if (stdout) {
                    console.log(stdout);
                }
                if (stderr) {
                    console.log(stderr);
                }
                console.log('Getting new PID');
                console.log("ps aux | awk '/" + repo_id + "/ && !/awk |curl / {print $2}'");
                exec("ps aux | awk '/" + repo_id + "/ && !/awk |curl / {print $2}'", function(err, pid) {
                    console.log('PID: "' + pid + '"');
                    var tapp = {
                        pid: 'unknown',
                        running: 'failed-to-start'
                    };

                    var pids = pid.split('\n');
                    var p = typeof pids[0] != 'undefined' ? parseInt(pids[0]) : 0;
                    if (p > 0) {
                        tapp.pid = p;
                        tapp.running = 'true';
                    }
                    console.log(tapp);
                    apps.merge(doc.appname, tapp, function() {
                        callback(true, p);
                    });
                });
            });
          }
        });
      }
    });
};

var app_restart = function (repo_id, callback) {
    app_stop(repo_id, function (rv) {
        setTimeout(function () {
            app_start(repo_id, function (rv, pid) {
                if (rv == false) {
                    callback(false);
                } else {
                    callback(true, pid);
                }
            });
        }, 1000);
    });
};
