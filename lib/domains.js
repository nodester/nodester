var request = require('request'),
    config = require('../config'),
    cradle = require('cradle'),
    lib = require('./lib');

module.exports = {
  post: function(req, res, next) {
    var appname = req.appname,
        domain = req.param("domain"),
        user = req.user,
        app = req.app;

    var gooddomain = lib.checkDomain(domain);
    if (gooddomain === true) {
      var aliasdomains = lib.get_couchdb_database('aliasdomains');
      aliasdomains.get(domain, function(err, doc) {
        if (err) {
          if (err.error == 'not_found') {
            aliasdomains.save(domain, {
              appname: app._id,
              host: '127.0.0.1',
              port: app.port,
              username: user._id
            }, function(err, resp) {
              if (err) {
                res.error(400, JSON.stringify({
                  status: "failure",
                  message: err.error + ' - ' + err.reason
                }) + '\n');
              } else {
                res.send({
                  "status": "success",
                  "message": "Domain added."
                });
              }
            });
          } else {
            res.error(400, JSON.stringify({
              status: "failure",
              message: err.error + ' - ' + err.reason
            }) + '\n');
          }
        } else {
          res.error(400, '{"status": "failure - domain already exists"}\n');
        }
      });
    } else {
      res.error(400, '{"status": "failure - ' + gooddomain + '"}\n');
    }
  },
  delete: function(req, res, next) {
    var appname = req.appname,
        domain = req.param("domain"),
        user = req.user,
        app = req.app;

    var gooddomain = lib.checkDomain(domain);
    if (gooddomain === true) {
      var aliasdomains = lib.get_couchdb_database('aliasdomains');
      aliasdomains.get(domain, function(err, doc) {
        if (err) {
          if (err.error == 'not_found') {
            res.error(400, '{"status": "failure - domain not found."}\n');
          } else {
            res.error(400, JSON.stringify({
              status: "failure",
              message: err.error + ' - ' + err.reason
            }) + '\n');
          }
        } else {
          if (doc.appname == appname) {
            aliasdomains.remove(domain, function(err, resp) {
              if (err) {
                res.error(400, JSON.stringify({
                  status: "failure",
                  message: err.error + ' - ' + err.reason
                }) + '\n');
              } else {
                res.send({
                  "status": "success",
                  "message": "Domain deleted."
                });
              }
            });
          } else {
            res.error(400, '{"status": "failure - domain is not for this app."}\n');
          }
        }
      });
    } else {
      res.error(400, '{"status": "failure - ' + gooddomain + '"}\n');
    }
  },
  get: function(req, res, next) {
    var user = req.user;
    var db = lib.get_couchdb_database('aliasdomains');
    // db.view('aliasdomains/all', {key: req.user._id}, function (err, resp) {
    db.view('aliasdomains/all', function(err, resp) {
      var domains = [];
      resp.forEach(function(row) {
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
};