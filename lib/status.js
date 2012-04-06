var request = require('request'),
  cradle = require('cradle'),
  lib = require('./lib'),
  config = require('../config');

module.exports = {
  get: function (req, res, next) {
    var apps = lib.get_couchdb_database('apps');
    var hostedapps = 0;
    var countrunning = 0;
    apps.view('nodeapps/all', {}, function (err, resp) {
      if (err) {
        res.json({
          status: "failure",
          message: err.error + ' - ' + err.reason
        },500);
      } else {
        resp.forEach(function (row) {
          if (row.running == "true") {
            countrunning++;
          }
          hostedapps++;
        });
        res.json({
          status: "up",
          appshosted: hostedapps,
          appsrunning: countrunning
        });
      }
    });
  }
};