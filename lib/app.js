/*
 * Nodester :: Open Source Node.JS PaaS
 * Apps wrapper|controller
 * @latestUpdate: 30-03-2012
 * @license GNU Affero
 */

/*jshint node:true, laxcomma:true, strict:false*/

var config      = require('../config')
  , fs          = require('fs')
  , path        = require('path')
  , cradle      = require('cradle')
  , spawn       = require('child_process').spawn
  , exec        = require('child_process').exec
  , lib         = require('./lib')
  , tearDown    = lib.tear_down_unionfs_chroot
  , updateProxy = lib.update_proxytable_map
  , getDatabase = lib.get_couchdb_database
  , unionfs     = require('./unionfs').unionfs
  , chroot      = require('./chroot').chroot
  , Controller  = module.exports
  , log         = process.log || console
  ;

// Shorthand

var cfg = config.opt;
/*
 * Get the log.sock and send it to the client
 * @api public
 */

// Color helpers
var COL = {
    'green'     : ['\033[32m', '\033[39m'],
    'magenta'   : ['\033[35m', '\033[39m']
  },
  LOG = {
   30:'INFO',
   40:'WARN'
  },
  LOGC = {
    30: ['\033[36m', 'INFO', '\033[39m'].join(''),
    40: ['\033[31m', 'WARN', '\033[39m'].join('')
  };

Controller.logs = function logs (req, res, next) {
  var appname   = req.appname
    // , user      = req.user
    // , raw       = req.query.raw 
    , app       = req.app
    , output    = ['raw','colorized','normal']
    , type      = output.indexOf(req.query.output) > -1 ? req.query.output : 'colorized'
    , app_error_log_sock = path.join(cfg.apps_home_dir, app.username, app.repo_id + '_chroot', '.nodester', 'logs.sock');

  log.info('Attempting to connect to %s\'s %s logs', app.username,appname);
  log.info('File : ' + app_error_log_sock );
  if (path.existsSync(app_error_log_sock)) {
    var timer = setTimeout(function () {
      res.json({
        status  : "failure",
        message : 'Timeout getting logs.'
      },500);
    }, 10000);
    var buff = '';
    /* 
    6-04-2012: 19:50 < alejandromg> hey guys any idea how can I catch a ECONNREFUSED 
           with net#createConnection to a *.sock? try/catch, looks like, doesn't work
    6-04-2012: 21:08 -!- anotherfries is now known as justicefries
    */
    var sock = exec('nc -U ' + app_error_log_sock);
    sock.stderr.on('data', function(data){
      /* The error handler works until exit action, just warn about it */
      log.warn('error %s' ,data.toString());
    });
    sock.stdout.on('data', function(data){
      buff += data.toString();
    });
    sock.once('exit',function(){
      clearTimeout(timer);
      var lines = [];
      try {
        lines = JSON.parse(buff);
        if (lines.logs) {
          lines = lines.logs.split('\n');
        } else {
          lines = [lines];
        }
      } catch(e){
        if (/\{/.test(e.message)){
          lines = buff.split('\n').filter(function(line){
            try {
              return JSON.parse(line);
            } catch(e) {
              return false;
            }
          }).map(function(line){
            line = JSON.parse(line);
            if (line.time){
              switch (type) {
                case 'normal':
                  return line.time + ' ' + LOG[parseInt(line.level, 10)] + ' | ' + appname + ': ' + line.msg;
                case 'raw':
                  return line;
                default:
                  return [
                    COL.green[0], line.time, COL.green[1], ' ',
                    LOGC[parseInt(line.level, 10)], ' | ', appname,
                    ': ', line.msg ].join('');
              }
            } else {
              return line;
            }
          });
        } else {
          lines = ['Error Parsing your files, try to restart your app'];
        }
      }
      res.json({
        status: 'success',
        lines :lines
      });
      /* Send the lines*/
    });
  } else {  
    res.json({
      status  : 'failure',
      message : 'No logs available.'
    }, 500);
  }
};

Controller.gitreset = function (req, res, next) {
  var appname = req.param("appname").toLowerCase();
  //var user = req.user;
  var app = req.app;
  var apps = getDatabase('apps');
  apps.get(appname, function (err, doc) {
    if (err) {
      res.json({
        status  : "failure",
        message : err.error + ' - ' + err.reason
      },500);
    } else {
      log.info('Resetting repo from git: %s', app.repo_id);
      var app_user_home = path.join(cfg.git_home_dir, app.username, app.repo_id);
      exec(cfg.app_dir + '/scripts/gitreset.js ' + app_user_home, function () {
        app_restart(app.repo_id, function() {
          res.json({
            status: "success"
          },200);
        });
      });
    }
  });
};

Controller['delete'] = function (req, res, next) {
  var appname = req.param("appname").toLowerCase()
    // , user    = req.user
    // , app     = req.app
    , db      = getDatabase('apps');

  db.get(appname, function (err, appdoc) {
    if (err) {
      res.json({
        status  : "failure",
        message : err.error + ' - ' + err.reason
      },500);
  
    } else {
        db.remove(appname, appdoc._rev, function (err, resp) {
        if (err) {
          res.json({
            status  : "failure",
            message : err.error + ' - ' + err.reason
          },500);
        } else {
        var app_user_home = path.join(cfg.apps_home_dir, appdoc.username, appdoc.repo_id)
          , app_git_home = path.join(cfg.git_home_dir, appdoc.username, appdoc.repo_id)
          , app_rw       = app_user_home + '_rw'
          , app_chroot   = app_user_home + '_chroot'
          ;

          tearDown(cfg.node_base_folder, app_user_home, app_rw, app_chroot, function () {
            updateProxy(function (err) {
              if (err) {
                log.warn('Error updating Proxy! - ' + err);
              }
              app_stop(appdoc.repo_id, function () {
                exec('sudo ' + cfg.app_dir + '/scripts/removeapp.js ' + app_user_home + ' ' + app_git_home,function (){});
              });
            });
          });
          res.json({
            "status": "success"
          });
        }
      });
    }
  });
};

Controller.put = function (req, res, next) {

  var appname = req.param("appname").toLowerCase()
    // , user    = req.user
    , app     = req.app
    , db      = getDatabase('apps');

  db.get(appname, function (err, appdoc) {
    if (err) {
      res.json({
        status: "failure",
        message: err.error + ' - ' + err.reason
      },500);
    } else {
      var start         = req.body.start
        //, app_user_home = path.join(cfg.apps_home_dir, appdoc.username)
        //, app_home      = path.join(app_user_home, appdoc.repo_id)
        , appDir        = path.join(cfg.git_home_dir, appdoc.username, appdoc.repo_id + '.git')
        , app_repo      = cfg.git_user + '@' + cfg.git_dom + ':' + appDir;

      if (typeof start != 'undefined' && start.length > 0) {
        db.merge(appname, { start: start }, function (err, resp) {
          res.json({
            status  : "success",
            port    : appdoc.port,
            gitrepo : app_repo,
            start   : start,
            running : appdoc.running,
            pid     : appdoc.pid
          });
        });
      } else {
        var running = req.body.running;
        switch (running) {
          case "true":
            if (appdoc.running == "true") {
              res.json({
                status: "failure - application already running."
              });
            } else {
              app_start(appdoc.repo_id, function (rv, pid) {
                var success = "false"
                  , running = "failed-to-start";
                if (rv === true) {
                  success = "success";
                  running = "true";
                  updateProxy(function (err) {
                    if (err) {
                      log.warn('Error updating Proxy! - ' + err);
                    }
                  });
                }
              db.merge(appname, { running: running, pid: pid}, function (err, resp) {
                res.json({
                  status  : success,
                  port    : appdoc.port,
                  gitrepo : app_repo,
                  start   : appdoc.start,
                  running : running,
                  pid     : pid
                });
              });
            });
          }
          break;
          /* endcase running=true */

        case "restart":
          app_restart(app.repo_id, function (rv, pid) {
            var success = "false"
              , running = "failed-to-restart";

            if (rv === true) {
              success = "success";
              running = "true";
            }
            db.merge(appname, { running: running, pid: pid }, function (err, resp) {
              res.json({
                status  : success,
                port    : appdoc.port,
                gitrepo : app_repo,
                start   : appdoc.start,
                running : running,
                pid     : pid
              });
            });
          });
          break;
          /*endcase running=restart */

        case "false":
          if (app.running != 'true') {
            res.json({
              status: "failure - application already stopped."
            },408);
          } else {
            app_stop(app.repo_id, function (rv) {
              var success = "false",
                running = "failed-to-stop";
              if (rv === true) {
                success = "success";
                running = "false";
                updateProxy(function (err) {
                  if (err) {
                    log.warn('Error updating Proxy! - ' + err);
                  }
                });
              }
              db.merge(appname, { running: running, pid: 'unknown'}, function (err, resp) {
                res.json({
                  status  : success,
                  port    : appdoc.port,
                  gitrepo : app_repo,
                  start   : appdoc.start,
                  running : running,
                  pid     : 'unknown'
                });
              });
            });
          }
          break;
          /* endcase running=false */
        default:
          res.json({
            status  : "failure",
            message : "Invalid action."
          },400);
          break;
          /* end switch case */
        }
      }
    }
  });
};
  
Controller.app_start = function (req, res, next) {


  var repo_id = req.query.repo_id
    , restart_key = req.query.restart_key;

  if (restart_key != cfg.restart_key) {
    res.json({
      status: "failed to start - invalid restart key"
    },403);
    return;
  } else {
    app_start(repo_id, function (rv, err) {
      if (rv === false) {
        res.json({
          status: "failed to start - " + err
        },200);
      } else {
        res.json({
          status: "started"
        },200);
      }
    }, true);
  }
};

Controller.app_stop = function (req, res, next) {
  
  var repo_id     = req.query.repo_id
    , restart_key = req.query.restart_key;

  if (restart_key != cfg.restart_key) {
    res.json({
      status: "failed to start - invalid restart key"
    }, 403);
    return;
  } else {
    app_stop(repo_id, function (rv) {
      if (rv === false) {
        res.json({
          status: "failed to stop"
        });
      } else {
        res.json({
          status: "stop"
        });
      }
    });
  }
  /* end of app_stop */
};

Controller.app_restart= function (req, res, next) {

  var repo_id = req.query.repo_id
    , restart_key = req.query.restart_key;

  if (restart_key != cfg.restart_key) {
    res.json({
      status: "failed to start - invalid restart key"
    },403);
    return;
  } else {
    app_restart(repo_id, function (rv) {
      if (rv === false) {
        res.json({
          status: "failed to restart"
        });
      } else {
        res.json({
          status: "restarted"
        });
      }
    }, true);
  }
};

Controller.get = function (req, res, next) {

  var location = path.join(cfg.git_home_dir, req.app.username, req.app.repo_id + '.git')
    , gitRepo = cfg.git_user + '@' + cfg.git_dom + ':' + location;

  res.json({
    status  : "success",
    port    : req.app.port,
    gitrepo : gitRepo,
    start   : req.app.start,
    running : req.app.running,
    pid     : req.app.pid
  });
};

Controller.post = function (req, res, next) {
  
  var appname = req.body.appname;
  
  if (!appname){
    appname = req.param("appname").toLowerCase();
  }
  var start = req.body.start;
  
  if (!appname) {
    res.json({
      status: "failure",
      message: "Appname Required"
    },500);
    return;
  }
  if (!/^[A-Z0-9_\-\.]*$/gi.test(appname)){
    res.json({
      status: "failure",
      message: "Invalid Appname"
    },500);
  }
  if (!start) {
    res.json({
      status: "failure",
      message: "Start File Required"
    },500);
    return;
  }
  var user = req.user
    , apps = getDatabase('apps');

  apps.get(appname, function (err, doc) {
    if (err) {
      if (err.error == 'not_found') {
        var nextport = getDatabase('nextport');
        nextport.get('port', function (err, next_port) {
          if (err) {
            res.json({
              status  : "failure",
              message : err.error + ' - ' + err.reason
            }, 500);
          } else {
            var appport = next_port.address
              , repo_id = next_port._rev;
            
            nextport.merge('port', { address: appport + 1 }, function (err, resp) {
              if (err) {
                res.json({
                  status  : "failure",
                  message : err.error + ' - ' + err.reason
                }, 500);
              } else {
                apps.save(appname, {
                  start    : start,
                  port     : appport,
                  username : user._id,
                  repo_id  : repo_id,
                  running  : false,
                  pid      : 'unknown',
                  env      : {}
                }, function (err, resp) {
                  if (err) {
                    res.json({
                      status: "failure",
                      message: err.error + ' - ' + err.reason
                    },500);
                  } else {
                    var repos = getDatabase('repos');
                    repos.save(repo_id, {
                      appname  : appname,
                      username : user._id
                    }, function (err, resp) {
                      if (err) {
                        res.json({
                          status  : "failure",
                          message : err.error + ' - ' + err.reason
                        },500);
                      } else {
                        var params = [ cfg.app_dir, cfg.git_home_dir, user._id, repo_id, start,
                                       cfg.userid, cfg.git_user, cfg.apps_home_dir];
                        var cmd = 'sudo ' + cfg.app_dir + '/scripts/gitreposetup.sh ' + params.join(' ');
                        
                        log.info('gitsetup cmd: %s', cmd);
                        exec(cmd, function (err, stdout, stderr) {
                          if (err) log.error('gitsetup error: %s', err);
                          if (stdout.length > 0) log.info('gitsetup stdout: %s', stdout);
                          if (stderr.length > 0) log.error('gitsetup stderr: %s', stderr);
                        });
                        // Respond to API request
                        var gitRepo = cfg.git_user + '@' + cfg.git_dom + ':' + path.join(cfg.git_home_dir, user._id, repo_id + '.git');
                        res.json({
                          status  : "success",
                          port    : appport,
                          gitrepo : gitRepo,
                          start   : start,
                          running : false,
                          pid     : "unknown"
                        });
                        updateProxy(function (err) {
                          if (err) {
                            log.warn('Error updating Proxy! - ' + err);
                          }
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
        res.json({
          status: "failure",
          message: err.error + ' - ' + err.reason
        },500);
      }
    } else {
      res.json({
        status  : "failure",
        message : "app exists"
      });
    }
  });
};

Controller.audit = function(req, res, next) {
  var db = getDatabase('apps');
  // abuser just for fun :)
  req.on('data',function(abuser){
    abuser = JSON.parse(abuser.toString());
    db.view('nodeapps/pid',{key:abuser.PID,limit:1},function(error,doc){
      var structure ={};
      if (doc && doc.length==1) {
        structure = {
          repo     : doc.value[0],
          username : doc.value[1],
          appname  : doc.value[3]
        };
        var msg  = ' ' + structure.username + '\'s ' + structure.appname + ' app.';
        if (abuser.code == 'N10'){
          msg = 'Stoping ' + msg;
          app_stop(structure.repo, function(rv){
            if (rv === false) {
              res.json({
                status: "failed to stop"
              });
            } else {
              res.json({
                status: "stop"
              });
            }
          });
        } else if (abuser.code == 'N11'){
          msg = 'Restarting '+msg;
          app_restart(structure.repo, function (rv) {
            if (rv === false) {
              res.json({
                status: "failed to restart",
                code:200
              });
            } else {
              res.json({
                status: "restarted",
                code: 200
              });
            }
          }, true);
        }
        log.info(msg);
      } else {
        // Kill it with fire dude
        res.json({code:200});
        res.end();
      }
    });
  });
  /* deprecated */ 
};

Controller.env_get = function (req, res, next) {

  var appname = req.appname.toLowerCase();
  var db = getDatabase('apps');
  db.get(appname, function (err, appdoc) {
    if (err) {
      res.json({
        status  : "failure",
        message : err.error + ' - ' + err.reason
      },500);
    } else {
      // var start = req.body.start; // I don't eve -_-
      db.get(appname, function (err, doc) {
        if (err) {
          res.json({
            status: "failure",
            message: err.error + ' - ' + err.reason
          },500);
        } else {
          /*
           * expose general variables, by default the doc.port and req.app.port
           * have the value, (req.app.port inherits from middle#authenticated_app)
           * And the NODE_ENV it's setting up manually by the user or by the nodester
           * instance
           */
          doc.env.app_port = doc.port || ((req.app && req.app.port) ? req.app.port : 80);
          doc.env.NODE_ENV = doc.env.NODE_ENV || 'production';
          res.json({
            status: "success",
            message: doc.env || {}
          });
        }
      });
    }
  });
  /* end getEnviromental vars */
};

Controller.env_version = function(req, res, next) {
  lib.check_available_versions(function(d){
    if (typeof d == 'array' || typeof d == 'object') {
      d = d.map(function(v){
            return v.trim().substr(0,7);
          });
    }
    res.json({
      main: process.version,
      available: d || 'Error'
    });
  });
};

Controller.check_env_version = function(req, res, next) {

  var version  = req.param('version') || false
    , res_code = 404
    , msg      = 'Invalid version, or not_found';

  // just avoiding potential errors
  if (version && lib.node_versions().indexOf(version)!==-1) {
    res_code = 200;
    msg = 'node-v'+version+ ' it\'s available';  
  } 
  res.json({
    version: version,
    statusCode: res_code,
    msg: msg
  });
};

Controller.env_put= function (req, res, next) {
  var appname = req.body.appname.toLowerCase()
    , db      = getDatabase('apps')
    , key     = req.body.key
    , value   = req.body.value;

  if (!key || !value) {
    res.json({
      status: "failure",
      message: "Must specify both key and value."
    },400);
    return;
  }
  db.get(appname, function (err, appdoc) {
    if (err) {
      res.json({
        status: "failure",
        message: err.error + ' - ' + err.reason
      },500);
    } else {
      env_update(res, db, appname, appdoc, key, value);
    }
  });
};

Controller.env_delete=function (req, res, next) {
  var appname = req.param("appname").toLowerCase()
    , db = getDatabase('apps')
    , key = req.param("key");

  if (!key) {
    res.json({
      status  : "failure",
      message : "Must specify key."
    },400);
    return;
  }
  db.get(appname, function (err, appdoc) {
    if (err) {
      res.json({
        status: "failure",
        message: err.error + ' - ' + err.reason
      },500);
    } else {
      env_update(res, db, appname, appdoc, key, undefined);
    }
  });
};

Controller.restartByName = function(req, res, next) {
  restart_by_name(req.params.appname, function(e,d){
    res.json({running:e, PID:d});
  });
};

var env_update = function (res, db, appname, appdoc, key, value) {
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
  db.merge(appname, { env: env }, function (err, resp) {
    if (err) {
      res.json({
        status  : "failure",
        message : err.error + ' - ' + err.reason
      },500);
    } else {
      res.json({
        status: "success",
        message: value === undefined ? ("DELETE " + key) : (key + "=" + value)
      });
    }
  });
};

var force_stop = function (repo_id, callback) {
    log.info('Forcing stop for: %s', repo_id);
    log.info("ps aux | awk '/" + repo_id + "/ && !/awk |curl / {print $2}'");
    exec("ps aux | awk '/" + repo_id + "/ && !/awk |curl / {print $2}'", function (err, pid) {
      if (err) {
        callback(false);
        return;
      }
      try {
        log.info('Forcing stop to PID: "' + pid + '"');
        if (pid.length > 0) {
          var pids = pid.split('\n'),
            k = false;

          var p = typeof pids[0] != 'undefined' ? parseInt(pids[0], 10) : 0;
          log.info('Force Stop  => p: "' + p + '"');
          if (p > 0) {
            log.info('Sending SIGKILL to %d', p);
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


var app_stop = function (repo_id, callback, skip_unmount) {

  var db = getDatabase('repos');
  db.get(repo_id, function (err, doc) {
    if (err) {
      callback(false);
    } else {
      var app_home = path.join(cfg.apps_home_dir, doc.username, doc._id);
      fs.readFile(path.join(app_home + '_rw', '.nodester', 'pids', 'runner.pid'), function (err, data) {
        if (err) {
          callback(false);
        } else {
          var pid = parseInt(data.toString(), 10);
          if (pid > 0) {
            try {
              /* tryception ? */
              try {
                process.kill(pid);
              } catch(e) {
                log.warn('App Stop action failed => %s', e.message);
              }
              var app_home = path.join(cfg.apps_home_dir, doc.username, repo_id);
              var app_rw = app_home + '_rw';
              var app_chroot = app_home + '_chroot';

              if (typeof skip_unmount == 'undefined' || skip_unmount !== true) 
                tearDown(cfg.node_base_folder, app_home, app_rw, app_chroot, function () {});

            } catch (e) {
              log.warn('tearDown action failed => %s', e.message);
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

var app_start = function (repo_id, callback) {
  var setupUnionFS = lib.setup_unionfs_chroot
    , db = getDatabase('repos');
  db.get(repo_id, function (err, doc) {
    if (err) {
      callback(false, err);
    } else {
      
      var user_home = path.join(cfg.apps_home_dir, doc.username)
        , app_home = user_home + '/' + repo_id
        , apps = getDatabase('apps');

      apps.get(doc.appname, function (err, app) {
        if (err) {
          return callback(false, err);
        } else {
          var configData = {
            appdir      : cfg.app_dir,
            userid      : cfg.app_uid,
            chroot_base : cfg.node_base_folder,
            apphome     : app_home,
            apprwfolder : path.join(app_home, '..', repo_id + '_rw'),
            appchroot   : path.join(app_home, '..', repo_id + '_chroot'),
            start       : app.start,
            port        : app.port,
            ip          : '127.0.0.1',
            name        : doc.appname,
            env         : app.env || {}
          };
          var msg = '';
          log.info('Checking: %s', configData.apphome);
          if (!path.existsSync(configData.apphome)) {
            //Bad install??
            msg = 'App directory does not exist: ' + configData.apphome;
            log.warn(msg);
            callback(new Error(msg));
            return;
          }
          log.info('Checking: %s', path.join(configData.apphome, app.start));
          if (!path.existsSync(path.join(configData.apphome, app.start))) {
            msg = ('App start file does not exist: ' + path.join(configData.apphome, app.start));
            log.warn(msg);
            return callback(new Error(msg));
          }

          log.info('Checking: %s', path.join(configData.apprwfolder, '.nodester'));
          if (!path.existsSync(path.join(configData.apprwfolder, '.nodester'))) {
            log.info('Making Directories..');
            if (!path.existsSync(configData.apprwfolder)) fs.mkdirSync(configData.apprwfolder, '0777');
            fs.mkdirSync(path.join(configData.apprwfolder, 'app'), '0777');
            fs.mkdirSync(path.join(configData.apprwfolder, '.nodester'), '0777');
            fs.mkdirSync(path.join(configData.apprwfolder, '.nodester', 'logs'), '0777');
            fs.mkdirSync(path.join(configData.apprwfolder, '.nodester', 'pids'), '0777');
          }
          try {
            fs.chmodSync(path.join(configData.apprwfolder, 'app'), '0777');
          } catch (e) {
            log.info('Failed to chmod %s/%s 0777', configData.apprwfolder, 'app');
          }
          log.info('Writing config data: %s ', path.join(configData.apprwfolder, '.nodester', 'config.json'));

          var configPath = path.join(configData.apprwfolder, '.nodester', 'config.json');
          try {
            fs.writeFileSync(configPath, JSON.stringify(configData),'utf8');
          } catch(excp) { 
            log.error(excp.message);
          }
          

          tearDown(configData.chroot_base, configData.apphome, configData.apprwfolder, configData.appchroot, function (resp) {
            setupUnionFS(configData.chroot_base, configData.apphome, configData.apprwfolder, configData.appchroot, function (resp) {
              if (resp === true) {
                
                // long line is long

                var cmd = 'cd ' + configData.appchroot ;
                    cmd += ' && ulimit -c unlimited -n 65000 -u 100000 -i 1000000 -l 10240 -s 102400 -m 25600 && sudo ';
                    cmd += path.join(cfg.app_dir, 'scripts', 'chroot_runner.js');
                log.info('Starting chroot process with %s', cmd);
                exec(cmd, function (error, stdout, stderr) {
                  if (stdout) {
                    log.info(stdout);
                  }
                  if (stderr) {
                    log.warn(stderr);
                  }
                  setTimeout(function () {
                    var tapp = {
                      pid     : 'unknown',
                      running : 'failed-to-start'
                    };
                    var fileRunner = path.join(configData.apprwfolder, '.nodester', 'pids', 'runner.pid');
                    fs.readFile(fileRunner, function (err, pids) {
                      var pid = parseInt(pids, 10);
                      if (pid > 0) {
                        tapp.pid = pid;
                        tapp.running = 'true';
                      }
                      apps.merge(doc.appname, tapp, function () {
                        callback(true, pid);
                      });
                    });
                  }, 1500);
                });
              } else {
                var tapp = {
                  pid     : 'unknown',
                  running : 'failed-to-setup_unionfs_chroot'
                };
                apps.merge(doc.appname, tapp, function () {
                  callback(false, tapp.running);
                });
              }
            });
          });
        }
      });
    }
  });
};

var app_restart = function (repo_id, callback) {
  app_stop(repo_id, function (rev) {
    setTimeout(function () {
      app_start(repo_id, function (rv, pid) {
        if (rv === false) {
          callback(false, pid);
        } else {
          callback(true, pid);
        }
      });
    }, 1500);
  }, true);
};

// expose restart method, withouth authentication but private (not via REST since we don't have apps)
module.exports.apprestart = app_restart;

var restart_by_name = function(appname,cb){
  var db =getDatabase('apps');
  db.get(appname, function(e,doc){
    if (!e && doc && doc.repo_id){
      log.info('Restarting => \t',appname);
      app_restart(doc.repo_id, function(running, pid){
        if (running){
          log.info( appname + ' restarted...');
        } else {
          log.warn( appname + 'Failed to restart');
        }
        cb(running,pid);
      });
    } else {
      cb('DEAD',null);
    }
  });
};

module.exports.restart_by_name = restart_by_name;
