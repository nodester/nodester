var config = require('../config'),
    cradle = require('cradle'),
    lib = require('./lib'),
    fs = require('fs');


module.exports = {
    delete: function(req, res, next) {
        var user = req.user;
            // need to delete all users apps
            // and stop all the users apps
        var db = lib.get_couchdb_database('nodefu');
        db.get(user._id, function (err, doc) {
          if (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end('{"status" : "failure", "message": "some strange error occured"}\n');
          } else {
            db.remove(user._id, doc._rev, function (err, resp) {
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
        
        var user = req.user;
        var newpass = req.body.password;
        var rsakey = req.body.rsakey;

        if (newpass) {
            var db = lib.get_couchdb_database('nodefu');
            db.get(user._id, function (err, doc) {
                if (err) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end('{"status" : "failure", "message": "some strange error occured"}\n');
                } else {
                    db.merge(user._id, {password: lib.md5(newpass)}, function (err, resp) {
                      if (err) {
                          res.writeHead(500, { 'Content-Type': 'application/json' });
                          res.end('{"status" : "failure", "message": "some strange error occured"}\n');
                      } else {
                          res.send({status: "success", message: "password updated"});
                      }
                    });
                }
            });
        } else if (rsakey) {
            stream = fs.createWriteStream(config.opt.home_dir + '/.ssh/authorized_keys', {
                'flags': 'a+',
                'encoding': 'utf8',
                'mode': 0644
            });
            stream.write('command="/usr/local/bin/git-shell-enforce-directory ' + config.opt.home_dir + '/' + config.opt.hosted_apps_subdir + '/' + user._id + '",no-port-forwarding,no-X11-forwarding,no-agent-forwarding,no-pty ' + rsakey + '\n', 'utf8');
            stream.end();
            res.send({status: "success", message: "ssh key updated"});
        };
    },
    post: function(req, res, next) {
        
        var newuser = req.body.user;
        var newpass = req.body.password;
        var email = req.body.email;
        var coupon = req.body.coupon;
        var rsakey = req.body.rsakey;
      
        if (req.body.coupon == config.opt.coupon_code) {
            var db = lib.get_couchdb_database('nodefu');
            db.get(newuser, function (err, doc) {
                if (err) {
                  if (err.error == 'not_found') {
                    if (typeof rsakey == 'undefined') {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.write('{"status": "failure - rsakey is invalid"}\n');
                        res.end();
                    } else {
                        stream = fs.createWriteStream(config.opt.home_dir + '/.ssh/authorized_keys', {
                            'flags': 'a+',
                            'encoding': 'utf8',
                            'mode': 0644
                        });
                        stream.write('command="/usr/local/bin/git-shell-enforce-directory ' + config.opt.home_dir + '/' + config.opt.hosted_apps_subdir + '/' + newuser + '",no-port-forwarding,no-X11-forwarding,no-agent-forwarding,no-pty ' + rsakey + '\n', 'utf8');
                        stream.end();
                        db.save(newuser, {password: lib.md5(newpass), email: email}, function (err, resp) {
                            if (err) {
                                res.writeHead(500, { 'Content-Type': 'application/json' });
                                res.end('{"status" : "failure", "message": "some strange error occured"}\n');
                            } else {
                                res.send({status: "success"});
                            }
                        });
                    }
                  } else {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end('{"status" : "failure", "message": "some strange error occured"}\n');
                  }
                } else {
                  res.writeHead(400, { 'Content-Type': 'application/json' });
                  res.write('{"status": "failure - account exists"}\n');
                  res.end();
                }
            });
        } else {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.write('{"status": "failure", "message": "invalid coupon"}\n');
            res.end();
        }
    }
};
