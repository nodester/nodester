var http = require('http');
var config = require("../config");
var sys = require('sys');
var exec = require('child_process').exec;

require('colors');

var action = process.argv[2];
var all = process.argv[3] || false;
var past = '';

switch (action) {
    case 'start':
        verb = 'Starting'.green;
        past = 'started';
        break;
    case 'stop':
        verb = 'Stopping'.red.bold;
        past = 'stopped';
        break;
    default:
        action = 'restart';
        verb = 'Restarting'.yellow;
        past = 'restarted';
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

var apps = [], count = 0;

var next = function() {
    if (apps.length) {
        var doc = apps.pop();
        console.log(verb + ': [' + (doc.username + '/' + doc.repo_id + '/' + doc.start + ':' + doc.port).blue + ']');
        var cmd = 'curl "http:/'+'/127.0.0.1:4001/app_' + action + '?repo_id=' + doc.repo_id + '&restart_key=' + config.opt.restart_key + '"';
        var child = exec(cmd, function (error, stdout, stderr) {
            next();
        });
    } else {
        console.log(('All ' + count + ' apps ' + past).bold);
    }
}

var start_running_apps = function (apps_arr) {
    for(var i in apps_arr) {
        var doc = apps_arr[i].value;
        if (doc.running == 'true' || all) {
            count++;
            apps.push(doc);
        }
    }
    console.log(verb + ' ' + count + ' apps..');
    next();
};
