var request = require('request'),
    lib = require('./lib'),
    config = require('../config');

module.exports = {
  get: function(req, res, next) {
    var user = req.user;

    var db = lib.get_couchdb_database('apps');
    db.view('nodeapps/all', function(err, resp) {
      var apps = [];
      resp.forEach(function(row) {
        if (row.username == user._id) {
          apps.push({
            name: row._id,
            port: row.port,
            gitrepo: config.opt.git_user + '@' + config.opt.git_dom + ':' + config.opt.git_home_dir + '/' + row.username + '/' + row.repo_id + '.git',
            running: row.running,
            pid: row.pid
          });
        }
      });
      res.send(apps);
    });
  }
};