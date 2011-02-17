var request = require('request'),
    path = require('path'),
    lib = require('./lib'),
    config = require('../config'),
    exec = require('child_process').exec;

module.exports = {
  post: function(req, res, next) {
    var appname = req.param("appname").toLowerCase();
    var action = req.param("action");
    var package = req.param("package");
    var user = req.user;
    var app = req.app;
    var good_action = false;
    switch (action) {
      case "install":
      case "update":
      case "uninstall":
        good_action = true;
      break;
    }

    if (good_action === true) {
      var app_user_home = path.join(config.opt.home_dir, config.opt.hosted_apps_subdir, user._id, app.repo_id);
      console.log(action + " " + package + " into " + app_user_home);
      var sep = ' ';
      if (package.indexOf(',') > -1) {
        sep = ',';
        package = package.replace(/ /g, '');
      }
      var p = package.split(sep);
      
      p.forEach(function(v, k) {
        p[k] = lib.escape_packages(v);
      });
      package = p.join(' ');
      var cmd = 'npm ' + action + ' ' + package + ' --root ' + path.join(app_user_home, '.node_libraries') + ' --binroot ' + path.join(app_user_home, '.npm_bin') + ' --manpath ' + path.join(app_user_home, '.npm_man');
      var pr = exec(cmd, function (err, stdout, stderr) {
        res.send({
          status: 'success',
          output: "stdout: " + stdout + "\nstderr: " + stderr
        });
      });
/*
  Why oh why doesn't this work.. Still the code above is, so that's good for me!
  var app_user_home = path.join(config.opt.home_dir, config.opt.hosted_apps_subdir, user._id, app.repo_id);
  var n = new npmwrapper();
  n.setup(path.join(app_user_home, '.node_libraries'), path.join(app_user_home, '.npm_bin'), path.join(app_user_home, '.npm_man'), action, package);
  n.run(function (output) {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.write(JSON.stringify({"status": 'success', output: output}) + '\n');
    res.end();
  });
*/
    } else {
      res.error(400, "failure - invalid action parameter");
    }
  }
}

