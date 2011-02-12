var request = require('request'),
    config = require('../config'),
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
        var app_user_home = path.join(config.opt.home_dir, config.opt.hosted_apps_subdir, user._id, app.repo_id);
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
    delete: function(req, res, next) {
        var appname = req.param("appname").toLowerCase();
        var user = req.user;
        var app = req.app;
        var apps = lib.get_couchdb_database('apps');
        apps.get(appname, function (err, doc) {
          if (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end('{"status" : "failure", "message": "some strange error occured"}\n');
          } else {
            apps.remove(appname, doc._rev, function (err, resp) {
              if (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end('{"status" : "failure", "message": "some strange error occured"}\n');
              } else {
                res.send({ "status" : "success" });
              }
            });
          }
        });
    },
    put: function(req, res, next) {
        var appname = req.param("appname").toLowerCase();
        var user = req.user;
        var app = req.app;
        var crud = new cradle.Connection({
            host: config.opt.couch_host,
            port: config.opt.couch_port,
            auth: { user: config.opt.couch_user, pass: config.opt.couch_pass },
            options: { cache: true, raw: false }
        });
        var db = crud.database(lib.couch_prefix + 'apps');
        db.get(appname, function (err, appdoc) {
            var start = req.param("start");
            var app_user_home = path.join(config.opt.home_dir, config.opt.hosted_apps_subdir, appdoc.username);
            var app_home = path.join(app_user_home, appdoc.repo_id);
            var app_repo = config.opt.git_user + '@' + config.opt.git_dom + ':' + path.join(config.opt.home_dir, config.opt.hosted_apps_subdir, appdoc.username, appdoc.repo_id + '.git');
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
                var running = req.param("running");
                switch (running) {
                    case "true":
                        if (appdoc.running == "true") {
                            res.error(res, 408, "failure - application already running.");
                        } else {
                            app_start(appdoc.repo_id, function (rv) {
                                var success = "false",
                                    running = "failed-to-start";
                                if (rv == true) {
                                    success = "success";
                                    running = "true";
                                }
                                db.merge(appname, {running: running}, function (err, resp) {
                                    res.send({
                                        status: success,
                                        port: appdoc.port,
                                        gitrepo: app_repo,
                                        start: appdoc.start,
                                        running: running,
                                        pid: appdoc.pid
                                    });
                                });
                            });
                        }
                        break;
                    case "restart":
                        app_restart(app.repo_id, function (rv) {
                            var success = "false",
                                running = "failed-to-restart";
                            if (rv == true) {
                                success = "success";
                                running = "true";
                            }
                            db.merge(appname, {running: running}, function (err, resp) {
                                res.send({
                                    status: success,
                                    port: appdoc.port,
                                    gitrepo: app_repo,
                                    start: appdoc.start,
                                    running: running,
                                    pid: appdoc.pid
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
                                }
                                db.merge(appname, {running: running}, function (err, resp) {
                                    res.send({
                                        status: success,
                                        port: appdoc.port,
                                        gitrepo: app_repo,
                                        start: appdoc.start,
                                        running: running,
                                        pid: appdoc.pid
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
        });
    },
    app_restart: function() {
        var repo_id = req.params("repo_id");
        var restart_key = req.param("restart_key");

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
            gitrepo: config.opt.git_user + '@' + config.opt.git_dom + ':' + path.join(config.opt.home_dir, config.opt.hosted_apps_subdir, req.app.username, req.app.repo_id + '.git'),
            start: req.app.start,
            running: req.app.running,
            pid: req.app.pid
        });
    },
    post: function(req, res, next) {
        var appname = req.body.appname;
        var start = req.body.start;
        var user = req.user;
        var apps = lib.get_couchdb_database('apps');
        apps.get(appname, function (err, doc) {
          if (err) {
            if (err.error == 'not_found') {
              var nextport = lib.get_couchdb_database('nextport');
              nextport.get('port', function (err, next_port) {
                  if (err) {
                      res.writeHead(500, { 'Content-Type': 'application/json' });
                      res.end('{"status" : "failure", "message": "some strange error occured"}\n');
                  } else {
                      var appport = next_port.address;
                      var repo_id = next_port._rev;
                      nextport.merge('port', {address: appport + 1}, function (err, resp) {
                          if (err) {
                              res.writeHead(500, { 'Content-Type': 'application/json' });
                              res.end('{"status" : "failure", "message": "some strange error occured"}\n');
                          } else {
                              apps.save(appname, {
                                  start: start,
                                  port: port,
                                  username: user._id,
                                  repo_id: repo_id,
                                  running: false,
                                  pid: 'unknown'
                              }, function (err, resp) {
                                  if (err) {
                                      res.writeHead(500, { 'Content-Type': 'application/json' });
                                      res.end('{"status" : "failure", "message": "some strange error occured"}\n');
                                  } else {
                                      var repos = lib.get_couchdb_database('repos');
                                      repos.save(repo_id, {appname: appname, username: user._id}, function (err, resp) {
                                        if (err) {
                                            res.writeHead(500, { 'Content-Type': 'application/json' });
                                            res.end('{"status" : "failure", "message": "some strange error occured"}\n');
                                        } else {
                                            var gitsetup = spawn(config.opt.app_dir + '/scripts/gitreposetup.sh', [config.opt.app_dir, config.opt.home_dir + '/' + config.opt.hosted_apps_subdir, user._id, repo_id, start]);
                                            // Respond to API request
                                            res.send({ status: "success",
                                                port: appport,
                                                gitrepo: config.opt.git_user + '@' + config.opt.git_dom + ':' + path.join(config.opt.home_dir, config.opt.hosted_apps_subdir, user._id, repo_id + '.git'),
                                                start: start,
                                                running: false,
                                                pid: "unknown"
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
              res.end('{"status" : "failure", "message": "some strange error occured"}\n');
            }
          } else {
            res.send({status: "failure", message: "app exists"});
          }
        });
    }
}


var force_stop = function(repo_id, callback) {
    console.log('Forcing stop for: ', repo_id);
    exec("ps aux | awk '/" + repo_id + "/ && !/awk/ {print $2}'", function(err, pid) {
        if (err) {
            callback(false);
            return;
        }
        try {
            pid = pid.replace('\n', '');
            pid = parseInt(pid, 1000);
            if (pid > 0) {
                process.kill(pid);
                callback(true);
            } else {
                callback(false);
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
        var app_home = path.join(config.opt.home_dir, config.opt.hosted_apps_subdir, doc.username, doc._id);
        fs.readFile(app_home + '/.app.pid', function (err, data) {
            if (err) {
                force_stop(repo_id, callback);
            } else {
                try {
                    var p = parseInt(data.toString());
                    if (p > 0) {
                        process.kill(p);
                        fs.unlink(app_home + '/.app.pid');
                    } else {
                        console.log(sys.inspect(data.toString()));
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
        var user_home = path.join(config.opt.home_dir, config.opt.hosted_apps_subdir, doc.username);
        var app_home = user_home + '/' + repo_id;
        var apps = lib.get_couchdb_database('apps');
        apps.get(doc.appname, function (err, app) {
          if (err) {
            callback(false);
          } else {
            var cmd = "sudo " + path.join(config.opt.app_dir, 'scripts', 'launch_app.sh') + ' ' + config.opt.app_dir + ' ' + config.opt.userid + ' ' + app_home + ' ' + app.start + ' ' + app.port + ' ' + '127.0.0.1' + ' ' + doc.appname;
            console.log(cmd);
            var child = exec(cmd, function (error, stdout, stderr) {});
            callback(true);
          }
        });
      }
    });
};

var app_restart = function (repo_id, callback) {
    app_stop(repo_id, function (rv) {
        setTimeout(function () {
            app_start(repo_id, function (rv) {
                if (rv == false) {
                    callback(false);
                } else {
                    callback(true);
                }
            });
        }, 1000);
    });
};
