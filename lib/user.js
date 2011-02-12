var request = require('request'),
    config = require('../config'),
    fs = require('fs');


module.exports = {
    delete: function(req, res, next) {
        var user = req.user;
            // need to delete all users apps
            // and stop all the users apps

        request({uri: config.couch_loc + 'nodefu/' + user._id + '?rev=' +  user._rev, method:'DELETE', headers: config.couch_headers }, function (err, response, body) {
            res.send({ "status" : "success" });
        });

    },
    put: function(req, res, next) {
        
        var user = req.user;
        var newpass = req.body.password;
        var rsakey = req.body.rsakey;

        if (newpass) {
            request({ uri: config.couch_loc + 'nodefu/' + user._id, method:'PUT', body: JSON.stringify({_rev: user._rev, password: config.md5(newpass) }), headers: config.couch_headers }, function (err, response, body) {
                //Empty Callback
            });
        }
        if (rsakey) {
            stream = fs.createWriteStream(config.opt.home_dir + '/.ssh/authorized_keys', {
                'flags': 'a+',
                'encoding': 'utf8',
                'mode': 0644
            });
            stream.write('command="/usr/local/bin/git-shell-enforce-directory ' + config.opt.home_dir + '/' + config.opt.hosted_apps_subdir + '/' + user._id + '",no-port-forwarding,no-X11-forwarding,no-agent-forwarding,no-pty ' + rsakey + '\n', 'utf8');
            stream.end();
        };
        res.send({ status : "success" });
    },
    post: function(req, res, next) {
        
        var newuser = req.body.user;
        var newpass = req.body.password;
        var email = req.body.email;
        var coupon = req.body.coupon;
        var rsakey = req.body.rsakey;
      
        if (req.body.coupon == config.opt.coupon_code) {

            request({ uri: config.couch_loc + 'nodefu/' + req.body.user, method: 'GET', headers: config.couch_headers}, function (err, response, body) {
                try {
                    var doc = JSON.parse(body);
                } catch (e) {}
                
                if (doc._id){
                    // account already registered
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.write('{"status": "failure - account exists"}\n');
                    res.end();
                } else {
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
                
                        // Save user information to database and respond to API request
                        request({uri: config.couch_loc + 'nodefu', method:'POST', body: JSON.stringify({_id: newuser, password: config.md5(newpass), email: email}), headers: config.couch_headers}, function (err, response, body) {
                              res.send({ "status": "success" });
                        });
                    }
                }
            });

        } else {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.write('{"status": "failure - invalid coupon"}\n');
            res.end();
        }
    }
};
