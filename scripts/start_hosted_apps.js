var http = require('http');
var config = require("../config");
var sys = require('sys');
var exec = require('child_process').exec;

require('colors');

var action = process.argv[2];

switch (action) {
    case 'start':
        verb = 'Starting'.green;
        break;
    case 'stop':
        verb = 'Stopping'.red.bold;
        break;
    default:
        action = 'restart';
        verb = 'Restarting'.yellow;
        break;
}

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
        console.log(verb + ': [' + (doc.username + '/' + doc.repo_id + '/' + doc.start + ':' + doc.port).blue + ']');
        var cmd = 'curl "http:/'+'/127.0.0.1:4001/app_' + action + '?repo_id=' + doc.repo_id + '&restart_key=' + config.opt.restart_key + '"  >/dev/null 2>&1 &';
        var child = exec(cmd, function (error, stdout, stderr) {});
    }
  }
};
