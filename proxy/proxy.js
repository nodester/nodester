#!/usr/bin/env node
/*

Nodester - Nodejs hosting
This app runs on port 80 and forwards traffic to the appropriate node app 

*/

var httpProxy = require('../lib/3rdparty/node-http-proxy'),
    url = require('url'),
    fs = require('fs'),
    path = require('path'),
    lib = require('../lib/lib'),
    exec = require('child_process').exec,
    util = require('util'),
    config = require('../config')
;

require.paths.unshift(path.join(config.app_dir, '../', '.node_libraries'));

var daemon = require('daemon');


lib.update_proxytable_map(function (err) {
  if (err) {
    console.log("err: " + JSON.stringify(err));
  } else {
    var proxy = httpProxy.createServer({router: config.opt.proxy_table_file, silent: false, hostname_only: true});
    proxy.listen(80);
    proxy.addListener('updateRoutes', function () {
      console.log('updateRoutes fired');
    });
    if (config.opt.enable_ssl === true) {
      var https = require('https');
      var options = {
        ca: fs.readFileSync(config.opt.app_dir + '/' + config.opt.ssl_ca_file),
        key: fs.readFileSync(config.opt.app_dir + '/' + config.opt.ssl_key_file),
        cert: fs.readFileSync(config.opt.app_dir + '/' + config.opt.ssl_cert_file)
      };
      var httpSsl = https.createServer(options, function (req, res) {
        var proxy = new httpProxy.HttpProxy(req, res);
	util.log('https: ' + req.headers.host + ', url: ' + req.url); 
        if (req.headers.host == 'cloudno.de' &&
	  (req.url.indexOf('/lead') == 0 ||
	   req.url.indexOf('/echo') == 0 ||
	   req.url.indexOf('/login') == 0 || req.url == '/')) {
          proxy.proxyRequest(80, "81.169.133.153", req, res);
        } 
	else if (req.headers.host == 'cloudno.de' &&
	  (req.url.indexOf('/monit') == 0)) {
	  req.url = req.url.substring(6);
	  proxy.proxyRequest(2812, "127.0.0.1", req, res);
	}
	else {
          proxy.proxyRequest(4001, "127.0.0.1", req, res);
	}
      });
      httpSsl.setMaxListeners(1000);
      httpSsl.listen(443);
      console.log('Nodester started on port 443');
    }
    daemon.setreuid(config.opt.uid);
    console.log('Switched to ' + process.getuid() + '.');
    console.log('Nodester started on port 80');
  }
});

process.on('uncaughtException', function (err) {
  console.log(err.stack);
});
