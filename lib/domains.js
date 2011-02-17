var request = require('request'),
    config = require('../config'),
    lib = require('./lib');

module.exports = {
    post: function(req, res, next) {
        var appname = req.appname;
        var action = req.param("action");
        var domain = req.param("domain");
        var user = req.user;
        var app = req.app;

        switch (action) {
            case "add":
                var gooddomain = lib.checkDomain(domain);
                if (gooddomain === true) {
                    request({ uri: config.couch_loc + 'aliasdomains/' + domain, method:'GET', headers: config.couch_headers }, function (err, response, body) {
                        try {
                            var doc = JSON.parse(body);
                        } catch (e) {}
                        
                        if (doc._id){
                            res.error(400, '{"status": "failure - domain already exists"}\n');
                        } else {
                            request({ uri: config.couch_loc + 'aliasdomains', method:'POST', body: JSON.stringify({_id: domain, appname: appname, username: user._id}), headers: config.couch_headers }, function (err, response, body) {
                                res.send({ "status": "success", "message": "Domain added." });
                            });
                        }
                    });
                } else {
                    res.error(400, '{"status": "failure - ' + gooddomain + '"}\n');
                }
                break;
            case "delete":
                var gooddomain = lib.checkDomain(domain);
                if (gooddomain === true) {
                    request({uri: config.couch_loc + 'aliasdomains/' + domain, method:'GET', headers: config.couch_headers }, function (err, response, body) {
                        try {
                            var doc = JSON.parse(body);
                        } catch (e) {}
                        
                        if (doc._id) {
                            if (doc.appname == appname) {
                                request({uri:couch_loc + 'aliasdomains/' + domain + '?rev=' + doc._rev, method:'DELETE', headers:h}, function (err, response, body) {
                                    res.send({ "status": "success", "message": "Domain deleted." });
                                });
                            } else {
                                res.error(400, '{"status": "failure - domain is not for this app."}\n');
                            }
                        } else {
                            res.error(400, '{"status": "failure - domain not found."}\n');
                        }
                    });
                } else {
                    res.error(400, '{"status": "failure - ' + gooddomain + '"}\n');
                }
                break;
            default:
                res.error(400, '{"status": "failure - invalid action parameter"}\n');
                break;
        }
    },
    get: function(req, res, next) {
        var user = req.user;

        var db = lib.get_couchdb_database('aliasdomains');
        db.view('aliasdomains/all', function (err, resp) {
          var domains = [];
          resp.forEach(function (row) {
            if (row.username == user._id) {
              domains.push({
                domain: row._id,
                appname: row.appname,
                host: row.host,
                port: row.port
              });
            }
          });
          res.send(domains);
        });    
    }

}
