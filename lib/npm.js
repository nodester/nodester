/*
 * NPM dependencies installer
 * Last Update: 04/03/2012
 * (c) Nodester 2012
 * Mainteiner: Alejandro Morales <vamg008@gmail.com>
 *
*/

var request       = require('request'),
    path          = require('path'),
    lib           = require('./lib'),
    node_versions = lib.node_versions(),
<<<<<<< HEAD
    config = require('../config'),
    exec = require('child_process').exec,
    fs = require('fs');
=======
    config        = require('../config'),
    exec          = require('child_process').exec,
    fs            = require('fs');
>>>>>>> a3b735eb02bae5dabec038fec8d0d6cdcd85618d

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
    case "list":
      good_action = true;
      break;
    }
    var app_user_npm_home = path.join(config.opt.apps_home_dir,app.username,app.repo_id);
    if (good_action === true) {
      var app_user_home = path.join(config.opt.apps_home_dir, app.username, app.repo_id + '_rw');
      var app_user_npm_home = path.join(config.opt.apps_home_dir, app.username, app.repo_id);
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
      var node_version;
      var process_version = process.version.replace('v','');
      // in the package what type of data is? #TODO
      // always a try/catch for avoid mistakes and exceptions on the package.json read operation
      try {
        node_version = JSON.parse(fs.readFileSync(app_user_npm_home + '/package.json', 'utf8'))['node'];
      } catch(e){
        node_version = process_version;
      }
<<<<<<< HEAD
      node_version = node_version === undefined ? process.version : node_version;
=======
      // I read the package.json but there is not a "node" key-value
      node_version = node_version === undefined ? process_version : node_version;
>>>>>>> a3b735eb02bae5dabec038fec8d0d6cdcd85618d
      if (node_versions.indexOf(node_version)===-1) {
        // I have a valid version, BUT nodester doesn't have it installed
        node_version = process_version;
      }
      // Inherit the installation to n, but n throw an error if the version is lower than 0.6.3
      var command = 'n npm ' +node_version;
      if (parseFloat(node_version) <0.6 ){
        command = 'npm ';
      }
      package = p.join(' ');
<<<<<<< HEAD
      var command = 'n npm '+node_version;
      if (parseFloat(node_version) < 0.6) {
        command='npm '
      }
      var cmd = 'cd ' + app_user_home + '; if [ ! -d node_modules ]; then mkdir node_modules; fi; '+ command +
	         ' ' + action + ' ' + package;
     var pr = exec(cmd, function(err, stdout, stderr) {
=======
      var cmd = 'cd ' + app_user_home + '; if [ ! -d node_modules ]; then mkdir node_modules; fi; '+ command  
                      + ' ' + action + ' ' + package;
      var pr = exec(cmd, function(err, stdout, stderr) {
>>>>>>> a3b735eb02bae5dabec038fec8d0d6cdcd85618d
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
};
