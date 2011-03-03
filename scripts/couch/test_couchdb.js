var sys = require('sys');
var http = require('http');
var config = require('../../config');
var request = require('request');

var h = {accept: 'application/json', 'content-type': 'application/json'};
var couch_loc = "http://" + config.opt.couch_user + ":" + config.opt.couch_pass + "@" + config.opt.couch_host + ":" + config.opt.couch_port + "/";
if (config.opt.couch_prefix.length > 0) {
  couch_loc += config.opt.couch_prefix + "_";
}

request({uri:couch_loc + 'nextport/port', method:'GET', headers:h}, function (err, response, body) {
  sys.puts(sys.inspect(err));
  sys.puts(sys.inspect(response));
  sys.puts(sys.inspect(body));
  var doc = JSON.parse(body);
  sys.puts(sys.inspect(doc));
});
