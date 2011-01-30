var url = require('url');
var base64_decode = require('base64').decode;
var crypto = require('crypto');
var sys = require('sys');
var spawn = require('child_process').spawn;
var exec = require('child_process').exec;
var fs = require('fs');
var npmwrapper = require('npm-wrapper').npmwrapper;

var request = require('request');
var h = {accept: 'application/json', 'content-type': 'application/json'};

var config = require("./config");

var app = {
  repo_id: "101-ac28fd404e3ce1fb61ac87d2a95fbc62"
};

var user = {
  _id: "meso"
};

var action = "install";
var package = "express";
package = "connect";
package = "socket.io";

var app_user_home = config.opt.home_dir + '/' + config.opt.hosted_apps_subdir + '/' + user._id + '/' + app.repo_id;
// console.log(app_user_home);
// process.exit();
var n = new npmwrapper();
n.setup(app_user_home + '/.node_libraries', app_user_home + '/.npm_bin', app_user_home + '/.npm_man', action, package);
n.run(function (output) {
  sys.puts(output);
});
