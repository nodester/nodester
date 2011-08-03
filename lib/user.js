var config = require('../config'),
    cradle = require('cradle'),
    lib = require('./lib'),
    path = require('path'),
    fs = require('fs'),
    exec = require('child_process').exec;


module.exports = {
  delete: function(req, res, next) {
    var user = req.user;
    // need to delete all users apps
    // and stop all the users apps
    var db = lib.get_couchdb_database('nodefu');
    db.get(user._id, function(err, doc) {
      if (err) {
        res.writeHead(500, {
          'Content-Type': 'application/json'
        });
        res.end(JSON.stringify({
          status: "failure",
          message: err.error + ' - ' + err.reason
        }) + '\n');
      } else {
        db.remove(user._id, doc._rev, function(err, resp) {
          if (err) {
            res.writeHead(500, {
              'Content-Type': 'application/json'
            });
            res.end(JSON.stringify({
              status: "failure",
              message: err.error + ' - ' + err.reason
            }) + '\n');
          } else {
            res.send({
              "status": "success"
            });
          }
        });
      }
    });
  },
  put: function(req, res, next) {

    var user = req.user;
    var newpass = req.body.password;
    var rsakey = req.body.rsakey;

    if (newpass) {
      var db = lib.get_couchdb_database('nodefu');
      db.get(user._id, function(err, doc) {
        if (err) {
          res.writeHead(500, {
            'Content-Type': 'application/json'
          });
          res.end(JSON.stringify({
            status: "failure",
            message: err.error + ' - ' + err.reason
          }) + '\n');
        } else {
          db.merge(user._id, {
            password: lib.md5(newpass)
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
              res.send({
                status: "success",
                message: "password updated"
              });
            }
          });
        }
      });
    } else if (rsakey) {
      exec('sudo ' + config.opt.app_dir + '/scripts/update_authkeys.js ' + config.opt.git_home_dir + '/' + user._id + ' "' + rsakey + '"');
      // This will improve when merging code to handle couchdb of all keys and generation of whole auth keys file in one go.
      res.send({
        status: "success",
        message: "rsa key added"
      });
    }
  },
  post: function(req, res, next) {

    var newuser = req.body.user;
    var newpass = req.body.password;
    var email = req.body.email;
    var coupon = req.body.coupon;
    var rsakey = req.body.rsakey;

    if (req.body.coupon == config.opt.coupon_code) {

      // check for symbols in password
      if (newpass.match(/[~!@#$%^&*()_+=-]/) !== null) {
        res.writeHead(400, {
          'Content-Type': 'application/json'
        });
        res.write('{"status": "failure - symbols in password"}\n');
        res.end();
      } else {

        var db = lib.get_couchdb_database('nodefu');
        db.get(newuser, function(err, doc) {
          if (err) {
            if (err.error == 'not_found') {
              if (typeof rsakey == 'undefined') {
                res.writeHead(400, {
                  'Content-Type': 'application/json'
                });
                res.write('{"status": "failure - rsakey is invalid"}\n');
                res.end();
              } else {
                exec('sudo ' + config.opt.app_dir + '/scripts/update_authkeys.js ' + config.opt.git_home_dir + '/' + newuser + ' "' + rsakey + '"');
                exec('sudo ' + config.opt.app_dir + '/bin/create_user_dir.js ' + newuser);
                db.save(newuser, {
                  password: lib.md5(newpass),
                  email: email
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
                    res.send({
                      status: "success"
                    });
                  }
                });
              }
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
            res.writeHead(400, {
              'Content-Type': 'application/json'
            });
            res.write('{"status": "failure - account exists"}\n');
            res.end();
          }
        });
      }
    } else {
      res.writeHead(500, {
        'Content-Type': 'application/json'
      });
      res.write('{"status": "failure", "message": "invalid coupon"}\n');
      res.end();
    }
  }
};