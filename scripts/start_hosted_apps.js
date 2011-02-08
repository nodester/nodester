var http = require('http');
// var base64_encode = require('base64').encode;
var config = require("../config");
var sys = require('sys');
var exec = require('child_process').exec;

var couch_http = http.createClient(config.opt.couch_port, config.opt.couch_host);
if (config.opt.couch_prefix.length > 0) {
  var cprefix = config.opt.couch_prefix + '_';
} else {
  var cprefix = '';
}

// var request = couch_http.request(
//   'GET',
//   '/' + cprefix + 'apps' + '/_design/nodeapps/_view/all',
//   {
//     'host': config.opt.couch_host,
//     'Authorization': "Basic " + base64_encode(new Buffer(config.opt.couch_user + ":" + (config.opt.couch_pass || "")))
//   }
// );

// NATIVE BASE64 HANDLING
var buff = new Buffer(config.opt.couch_user + ':' + config.opt.couch_pass, encoding='ascii');
var dbcreds = buff.toString('base64')
var request = couch_http.request(
  'GET',
  '/' + cprefix + 'apps' + '/_design/nodeapps/_view/all',
  {
    'host': config.opt.couch_host,
    'Authorization': "Basic " + dbcreds || ""
  }
);


request.end();
request.on('response', function (response) {
  var buff = '';
  if (response.statusCode != 200) {
    console.log(response.statusCode);
    console.log('Error: Cannot query CouchDB');
    process.exit(1);
  }
  response.setEncoding('utf8');
  response.on('data', function (chunk) {
    buff += chunk;
  });
  response.on('end', function () {
    var resp = JSON.parse(buff);
    start_running_apps(resp.rows);
  });
});

var start_running_apps = function (apps_arr) {
  for(var i in apps_arr) {
    var doc = apps_arr[i].value;
    if (doc.running == 'true') {
      var user_home = config.opt.home_dir + '/' + config.opt.hosted_apps_subdir + '/' + doc.username;
      var app_home = user_home + '/' + doc.repo_id;
      var cmd = "sudo " + config.opt.app_dir + '/scripts/launch_app.sh ' + config.opt.app_dir + ' ' + config.opt.userid + ' ' + app_home + ' ' + doc.start + ' ' + doc.port + ' ' + '127.0.0.1' + ' ' + doc._id; 
      var child = exec(cmd, function (error, stdout, stderr) {});
    }
  }
};
