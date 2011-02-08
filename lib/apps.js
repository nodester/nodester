var request = require('request'),
    config = require('./config');

module.exports = {
    get: function(req, res, next) {
        var user = req.user;

        request({ method: 'GET', uri: config.couch_loc + 'apps/' + '/_design/nodeapps/_view/all', headers: config.couch_headers }, function (err, response, body) {  
          var docs = JSON.parse(body);
          if (docs) { // Maybe better error handling here
            var apps = [];
            var i;
            for (i=0; i<docs.rows.length; i++) {
              if (user._id == docs.rows[i].value.username) {
                apps.push({
                  name: docs.rows[i].id
                , port: docs.rows[i].value.port
                , gitrepo: config.opt.git_user + '@' + config.opt.git_dom + ':' + config.opt.home_dir + '/' + config.opt.hosted_apps_subdir + '/' + docs.rows[i].value.username + '/' + docs.rows[i].value.repo_id + '.git'
                , start: docs.rows[i].value.start
                , running: docs.rows[i].value.running
                , pid: docs.rows[i].value.pid
                });
              }
            }
            res.send(apps);
          } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.write('{"status" : "failure - applications not found"}');
            res.end();
          }
        });
    
    }
}

