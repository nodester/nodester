var http = require('http');
var base64_encode = require('base64').encode;
var config = require("../config");
var sys = require('sys');
var exec = require('child_process').exec;
var h = {accept: 'application/json', 'content-type': 'application/json'};

var couch_loc = "http://" + config.opt.couch_user + ":" + config.opt.couch_pass + "@" + config.opt.couch_host + ":" + config.opt.couch_port + "/";
if (config.opt.couch_prefix.length > 0) {
  couch_loc += config.opt.couch_prefix + "_";
}
console.log(couch_loc);

var couch_http = http.createClient(config.opt.couch_port, config.opt.couch_host);
if (config.opt.couch_prefix.length > 0) {
  var cprefix = config.opt.couch_prefix + '_';
} else {
  var cprefix = '';
}

var req = couch_http.request(
  'GET',
  '/' + cprefix + 'apps' + '/_design/nodeapps/_view/all',
  {
    'host': config.opt.couch_host,
    'Authorization': "Basic " + base64_encode(new Buffer(config.opt.couch_user + ":" + (config.opt.couch_pass || "")))
  }
);
req.end();
req.on('response', function (response) {
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
    create_repo_entries(resp.rows);
  });
});

var request = require('request');

var entries = [];

var create_repo_entries = function (apps_arr) {
  var t = 0;
  for(var i in apps_arr) {
    t = t + 1;
    var doc = apps_arr[i].value;
    entries.push(doc);
  }
  run_create();
};

var run_create = function () {
  var doc = entries.pop();
  var repo_id = doc.repo_id;
  var appname = doc._id;
  var username = doc.username;
  var body = JSON.stringify({_id: repo_id, appname: appname, username: username});
/*
  console.log(
    ' repo_id: ' + sys.inspect(repo_id) +
    ' appname: ' + sys.inspect(appname) +
    ' username: ' + sys.inspect(username) +
    ' body: ' + sys.inspect(body)
  );
*/
  request({uri:couch_loc + 'repos', method: 'POST', body: body, headers: h}, function (err, response, body) {
    console.log("err: " + err + " body: " + body);
    if (entries.length > 0) {
      run_create();
    }
  });
};
