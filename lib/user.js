/*
 * User actions
 * Nodester - Open Source PaaS
 * http://nodester.com
 */

var config = require('../config')
  , cradle = require('cradle')
  , lib    = require('./lib')
  , path   = require('path')
  , fs     = require('fs')
  , exec   = require('child_process').exec
  , User   = module.exports
  ;

var isValidKey = function (key) {
  var decoded, type, _ref;
  _ref = key.split(' '), type = _ref[0], key = _ref[1];
  if (!((type != null) && (key != null) && (type === 'ssh-rsa' || type === 'ssh-dss'))) {
    return false;
  }
  decoded = new Buffer(key, 'base64').toString('ascii');
  if (decoded.indexOf('ssh-rsa') === -1 && decoded.indexOf('ssh-dss') === -1) {
    return false;
  }
  return true;
};


User.delete = function (req, res, next) {
  
  var user = req.user
    , db = lib.get_couchdb_database('nodefu');

  db.get(user._id, function (err, doc) {
    if (err) {
      res.json({
        status  : "failure",
        message : err.error + ' - ' + err.reason
      },500);
    } else {
      db.remove(user._id, doc._rev, function (err, resp) {
        if (err) {
          res.json({
            status  : "failure",
            message : err.error + ' - ' + err.reason
          },500);
        } else {
          res.json({
            status : "success"
          });
        }
      });
    }
  });
};
User.put = function (req, res, next) {

  var user    = req.user
    , newpass = req.body.password
    , rsakey  = req.body.rsakey
    ;

  if (newpass) {
    // validate passwords
    if (newpass.length < 1) {
      res.json({
        status: "failure - invalid password. must be at least 1 character"
      },400);
      return true;
    } 
    if (user.match(/^[a-z0-9]+$/i) === null){
      res.json({
        status: "failure - invalid username. must be alphanumeric"
      },400);
      return true;
    }
    var db = lib.get_couchdb_database('nodefu');
    db.get(user._id, function (err, doc) {
      if (err) {
        res.json({
          status  : "failure",
          message : err.error + ' - ' + err.reason
        },500);
      } else {
        db.merge(user._id, {
          password: lib.md5(newpass)
        }, function (err, resp) {
          if (err) {
            res.json({
              status  : "failure",
              message : err.error + ' - ' + err.reason
            },500);
          } else {
            res.json({
              status  : "success",
              message : "password updated"
            });
          }
        });
      }
    });
  } else if (rsakey) {
    if (!isValidKey(rsakey)) {
      res.json({
        status  : "failure",
        message : "invalid rsa key"
      });
    } else {
      exec('sudo ' + config.opt.app_dir + '/scripts/update_authkeys.js ' + config.opt.git_home_dir + '/' + user._id + ' "' + rsakey + '"');
      // This will improve when merging code to handle couchdb of all keys and generation of whole auth keys file in one go.
      res.json({
        status  : "success",
        message : "rsa key added"
      });
    }
  }
};
User.post = function (req, res, next) {

  var newuser = req.body.user
    , newpass = req.body.password
    , email   = req.body.email
    , coupon  = req.body.coupon
    , rsakey  = req.body.rsakey
    ;

  if (req.body.coupon == config.opt.coupon_code) {

    // validate passwords
    if (newpass && newpass.length < 1) {
      res.json({
        status: "failure - invalid password. must be at least 1 character"
        },400);
      return true;
    } else if (newuser.match(/^[a-z0-9]+$/i) === null){
      res.json({
        status: "failure - invalid username. must be alphanumeric"
      },400);
      return;
    } else {

      var db = lib.get_couchdb_database('nodefu');
      db.get(newuser, function (err, doc) {
        if (err) {
          if (err.error == 'not_found') {
            if (typeof rsakey == 'undefined' || !isValidKey(rsakey)) {
              res.json({
                status: "failure - rsakey is invalid"
              },400);
            } else {
              exec('sudo ' + config.opt.app_dir + '/scripts/update_authkeys.js ' + config.opt.git_home_dir + '/' + newuser + ' "' + rsakey + '"');
              exec('sudo ' + config.opt.app_dir + '/bin/create_user_dir.js ' + newuser);
              db.save(newuser, {
                password: lib.md5(newpass),
                email: email
              }, function (err, resp) {
                if (err) {
                  res.json({
                    status: "failure",
                    message: err.error + ' - ' + err.reason
                  },500);
                } else {
                  res.json({
                    status: "success"
                  });
                }
              });
            }
          } else {
            res.json({
              status: "failure",
              message: err.error + ' - ' + err.reason
            },500);
          }
        } else {
          res.json({
            status: "failure - account exists"
          },500);
        }
      });
    }
  } else {
    res.json({
      status: "failure", "message": "invalid coupon"
      },500);
  }
}

