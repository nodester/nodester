#!/usr/bin/node
/*

Nodester - Nodejs hosting
This app runs on port 80 and forwards traffic to the appropriate node app 

*/

var httpProxy = require('../lib/3rdparty/http-proxy'),
    https = require('https'),
    url = require('url'),
    sys = require('sys'),
    fs = require('fs'),
    lib = require('../lib/lib'),
    daemontools = require('daemon-tools')
    config = require('../config')
;

lib.update_proxytable_map(function (err) {
  if (err) {
    console.log("err: " + JSON.stringify(err));
  } else {
    // var proxy = httpProxy.createServer({router: config.opt.proxy_table_file});
    var proxy = httpProxy.createServer({router: config.opt.proxy_table_file, silent: false, hostname_only: true});
    proxy.listen(80);
    proxy.addListener('updateRoutes', function () {
      console.log('updateRoutes fired');
    });
    if (config.opt.enable_ssl === true) {
      var options = {
        ca: fs.readFileSync(config.opt.app_dir + '/' + config.opt.ssl_ca_file),
        key: fs.readFileSync(config.opt.app_dir + '/' + config.opt.ssl_key_file),
        cert: fs.readFileSync(config.opt.app_dir + '/' + config.opt.ssl_cert_file)
      };
      var httpSsl = https.createServer(options, function (req, res) {
        var proxy = new httpProxy.HttpProxy(req, res);
        proxy.proxyRequest(4001, "127.0.0.1", req, res);
      });
      httpSsl.setMaxListeners(1000);
      httpSsl.listen(443);
      sys.puts('Nodester started on port 443');
    }
    daemontools.setreuid_username(config.opt.userid);
    sys.puts('Nodester started on port 80');
  }
});

/*
process.on('uncaughtException', function (err) {
  console.log(err);
});
*/
