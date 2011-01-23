
var sys = require('sys');
var http = require('http');
var config = require('../config');
var base64_encode = require('base64').encode;

var create_couchdb_table = function (port, hostname, tablename, callback) {
  var co = http.createClient(port, hostname);
  var req = co.request('PUT', '/' + tablename, {
    host: hostname,
    'Authorization': "Basic " + base64_encode(new Buffer(config.opt.couch_user + ":" + (config.opt.couch_pass || "")))
  });
  var rtv = false;
  req.end();
  req.on('response', function (resp) {
    switch (resp.statusCode) {
      case 201:
        rtv = true;
        break;
    }
    callback(rtv);
  });
};

for(var i in config.opt.couch_tables) {
  (function () {
  var tabname = config.opt.couch_prefix + "_" + config.opt.couch_tables[i];
  create_couchdb_table(config.opt.couch_port, config.opt.couch_host, tabname, function (success) {
    if (success) {
      sys.puts(tabname + " was created.");
    } else {
      sys.puts(tabname + " failed to be created.");
    }
  });
  })();
}
