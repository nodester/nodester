var lib = require('./lib'),
    cradle = require('cradle'),
    config = require('../config');

/**
 * Dynamic express route to authenticate a user from CouchDB
 */
var authenticate = function(req, res, next) {
  var basicauth = req.headers.authorization;

  if (typeof basicauth != 'undefined' && basicauth.length > 0) {
    var buff = new Buffer(basicauth.substring(basicauth.indexOf(" ") + 1), encoding = 'base64');
    var creds = buff.toString('ascii');

    var username = creds.substring(0, creds.indexOf(":"));
    var password = creds.substring(creds.indexOf(":") + 1);

    var db = lib.get_couchdb_database('nodefu');
    db.get(username, function(err, doc) {
      if (err) {
        console.log(err);
        res.writeHead(401, {
          'Content-Type': 'application/json'
        });
        // res.end('{"status" : "failure", "message": "couchdb error."}\n');
        // Notifiy Admins that couchdb is failing maybe? if not not_found error
        res.end('{"status" : "failure", "message": "Invalid username or password. CouchDB lookup failed."}\n');
      } else {
        if (doc._id == username && doc.password == lib.md5(password)) {
          req.user = doc;
          next();
        } else {
          res.writeHead(401, {
            'Content-Type': 'application/json'
          });
          res.end('{"status" : "failure", "message": "Invalid username or password."}\n');
        }
      }
    });
  } else {
    res.writeHead(401, {
      'Content-Type': 'application/json'
    });
    res.write('{"status" : "No authentication data sent."}\n');
    res.end();
  }
};

/**
 * Use CouchDB to get repo information, this route must come AFTER middle.authenticate
 */
var authenticate_app = function(req, res, next) {
  //GET Request
  var appname = req.params.appname;
  //POST|DELETE|PUT requests
  if (!appname && req.query && req.query.appname) {
    appname = req.query.appname;
  }
  if (!appname && req.body && req.body.appname) {
    appname = req.body.appname;
  }
  if (appname) {
    appname = appname.toLowerCase();
  }

  if (!appname || appname === '') {
    res.writeHead(400, {
      'Content-Type': 'application/json'
    });
    res.end('{"status" : "Must pass an application name (appname)."}\n');
    return;
  }

  if (req.user) {
    var db = lib.get_couchdb_database('apps');
    db.get(appname, function(err, doc) {
      if (err) {
        res.writeHead(400, {
          'Content-Type': 'application/json'
        });
        res.end('{"status" : "failure - app not found (' + appname + ')"}\n');
      } else {
        if (doc.username == req.user._id || req.user._id == 'dan') {
          req.appname = appname;
          req.repo = req.app = doc;
          next();
        } else {
          res.writeHead(400, {
            'Content-Type': 'application/json'
          });
          res.end('{"status" : "failure - authentication for ' + appname + ' failed."}\n');
        }
      }
    });
  } else {
    res.writeHead(400, {
      'Content-Type': 'application/json'
    });
    res.end('{"status" : "failure - authentication."}\n');
  }
};


module.exports.authenticate = authenticate;
module.exports.authenticate_app = authenticate_app;
/*
 * Generic request error handler.
 */
module.exports.error = function() {
  return function(req, res, next) {
    res.error = function(code, message) {
      res.writeHead(code, {
        'Content-Type': 'application/json'
      });
      res.end(JSON.stringify({
        status: message
      }));
    };
    next();
  };
};