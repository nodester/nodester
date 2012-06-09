/*
 * Nodester :: Open Source Node.JS PaaS
 * Domains wrapper
 * @license GNU Affero
 * @latestUpdate: 08-06-2012
 */

/*jshint node:true, noempty:true, laxcomma:true, laxbreak:false */

var request = require('request')
  , config  = require('../config')
  , cradle  = require('cradle')
  , lib     = require('./lib')
  ;

// Post action for domains
// this simple add a new domain to the list
function post (req, res, next) {
  var appname = req.appname
    , domain = req.param("domain")
    , user   = req.user
    , app    = req.app
    ;

  // validate the TLD
  var gooddomain = lib.checkDomain(domain);
  if (gooddomain === true) {
    var aliasdomains = lib.get_couchdb_database('aliasdomains');
    aliasdomains.get(domain, function (err, doc) {
      if (err) {
        if (err.error == 'not_found') {
          aliasdomains.save(domain, {
            appname: app._id,
            host: '127.0.0.1',
            port: app.port,
            username: user._id
          }, function (err, resp) {
            if (err) {
              res.json({
                status: "failure",
                message: err.error + ' - ' + err.reason
              }, 400);
            } else {
              res.json({
                status: "success",
                message: "Domain added."
              }, 200);
            }
          });
        } else {
          res.json({
            status: "failure",
            message: err.error + ' - ' + err.reason
          }, 400);
        }
      } else {
        res.json({
          status: "failure - domain already exists"
        }, 400);
      }
    });
  } else {
    res.json({
      status: 'failure - ' + gooddomain
    }, 400);
  }
}

// deletes a domain
function erase (req, res, next) {
  var appname = req.param("appname").toLowerCase()
    , domain = req.param("domain").toLowerCase()
    , user   = req.user
    , app    = req.app
    ;

  var gooddomain = lib.checkDomain(domain);
  if (gooddomain === true) {
    var aliasdomains = lib.get_couchdb_database('aliasdomains');
    aliasdomains.get(domain, function (err, doc) {
      if (err) {
        if (err.error == 'not_found') {
          res.json({
            status: "failure - domain not found."
          }, 400);
        } else {
          res.json({
            status: "failure",
            message: err.error + ' - ' + err.reason
          }, 400);
        }
      } else {
        if (doc.appname == appname) {
          aliasdomains.remove(domain, function (err, resp) {
            if (err) {
              res.json({
                status: "failure",
                message: err.error + ' - ' + err.reason
              }, 400);
            } else {
              res.json({
                status: "success",
                message: "Domain deleted."
              }, 400);
            }
          });
        } else {
          res.json({
            status: "failure - domain is not for this app."
          }, 400);
        }
      }
    });
  } else {
    res.json({
      status: "failure - " + gooddomain
    }, 400);
  }
}


// get all the domains
function get (req, res, next) {
  var user = req.user
    , db = lib.get_couchdb_database('aliasdomains')
    ;


  db.view('aliasdomains/all', {}, function (err, resp) {
    if (err) {
      res.json({status: 'failed to get'}, 400);
      return;
    }
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
    res.json(domains);
  });
}

module.exports = {
  post: post,
  delete: erase,
  get: get
};
