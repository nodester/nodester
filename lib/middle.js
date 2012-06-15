var lib = require('./lib')
  , cradle = require('cradle')
  , config = require('../config')
  , EventEmitter = require('events').EventEmitter
  , dash = process.dash || new EventEmitter()
  , log   = process.log || (new require('bunyan'))({name: "nodester"})
  ;

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
        log.error(err);
        res.json({
          status : "failure",
          message : "Invalid username or password. CouchDB lookup failed."
        },401);

        
        return;
      } else {
        if (doc._id == username && doc.password == lib.md5(password)) {
          req.user = doc;
          next();
        } else {
          res.json({
              status : "failure", 
              message: "Invalid username or password."
          }, 401)
          return;
        }
      }
    });
  } else {
    res.json({"status" : "No authentication data sent."},401);
  return;
  }
};
var authenticate_admin = function(req, res, next) {
  var basicauth = req.headers.authorization;
  if (typeof basicauth != 'undefined' && basicauth.length > 0) {
    var buff     = new Buffer(basicauth.substring(basicauth.indexOf(" ") + 1), encoding = 'base64')
      , creds    = buff.toString('ascii')
      , username = creds.substring(0, creds.indexOf(":"))
      , password = creds.substring(creds.indexOf(":") + 1)
      , db       = lib.get_couchdb_database('admins')
      ;
    db.view('all/name',{key:username,limit:1}, function(err, doc) {
      if (err) {
        log.error(err);
        res.json({
          status : "failure", 
          message: "Invalid username or password. CouchDB lookup failed."
        },401);
        
        return;
      } else {
        if (doc[0].value.username == username && doc[0].value.password == lib.md5(password)) {
          req.user = doc;
          next();
        } else {
          res.json({
            status  : "failure", 
            message : "Invalid username or password."
          },401);
          return;
        }
      }
    });
  } else {
    res.json({
      status : "No authentication data sent."
    },401);
    return;
  }
};
/**
 * Use CouchDB to get repo information, this route must come AFTER middle.authenticate
 */
var authenticate_app = function(req, res, next) {

  //GET Request
  var appname = req.param("appname");
  // var appname = req.params.appname;
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
    res.json({
      status : "Must pass an application name (appname)."
    },400);
    return;
  }

  if (req.user) {
    var db = lib.get_couchdb_database('apps');
    db.get(appname, function(err, doc) {
      if (err) {
        res.json({
          status : "failure - app not found (" + appname + ")"
        },400);
        return;
      } else {
        if (doc.username == req.user._id) {
          req.appname = appname;
          req.repo = req.app = doc;
          next();

        } else {
          res.json({
            status : "failure - authentication for " + appname + " failed."
          },401);
           return;
        }
      }
    });
  } else {
    res.json({
      status : "failure - authentication."
    },401);
    return;
  }
};

var deprecated = function(req, res, next) {
  res.header('X-Deprecated');
  next();
};

module.exports.authenticate       = authenticate;
module.exports.authenticate_admin = authenticate_admin;
module.exports.authenticate_app   = authenticate_app;
module.exports.deprecated         = deprecated;
/*
 * Generic request error handler.
 */
module.exports.error = function() {
  return function(req, res, next) {
    res.error = function(code, message) {
      res.json({
        status: message
      },code);
    }
    next();
  };
};
