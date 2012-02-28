#!/usr/bin/env node

var lib = require('../lib/lib'),
  fs = require('fs'),
  config = require('../config'),
  bouncy = require('bouncy');

console.log('Starting proxy initialization');

var proxymap = {};

// Ghetto hack for error page
var getErrorPage = function (title, code, error) {
    var errorPage = '<html><head><title id="title">{title}</title></head><body><br/><br/><br/><br/><br/><center><img src="http://nodester.com/images/rocket-down.png" alt="logo" /><br/><h1 style ="color:#000;font-family:Arial,Helvetica,sans-serif;font-size:38px;font-weight:bold;letter-spacing:-2px;padding:0 0 5px;margin:0;">{code}</h1><h3 style ="color:#000;font-family:Arial,Helvetica,sans-serif;font-size:24px;font-weight:bold;padding:0 0 5px;margin:0;">{error}</h3></center></body></html>';
    return errorPage.replace('{title}', title).replace('{code}', code).replace('{error}', error);
  };

//Update proxymap any time the routing file is updated
fs.watchFile(config.opt.proxy_table_file, function (oldts, newts) {
  fs.readFile(config.opt.proxy_table_file, function (err, data) {
    if (err) {
      console.log('Proxy map failed to update! (read)');
      throw err;
    } else {
      proxymap = JSON.parse(data);
      console.log('Proxy map updated');
    }
  });
});

//Don't crash br0
process.on('uncaughtException', function (err) {
  console.log('Uncaught error: ' + err.stack);
});


//Pulls out DB records and puts them in a routing file
lib.update_proxytable_map(function (err) {
  if (err) {
    console.log('err writing initial proxy file: ' + JSON.stringify(err));
    throw err;
  } else {
    console.log('Initial Proxy file written successfully!');
  }
});

bouncy(function (req, bounce) {
  if (!req.headers.host) {
    var res = bounce.respond();
    res.statusCode = 400;
    return res.end(getErrorPage('400 - Invalid request', '400', 'Invalid request'));
  }
  var host = req.headers.host.replace(/:\d+$/, '');
  var route = proxymap[host] || proxymap[''];
  console.log(host + ':' + route);
  req.on('error', function (err) {
    var res = bounce.respond();
    res.statusCode = 500;
    return res.end(getErrorPage('500 - Application error', '503', 'Application error'));
  });
  if (route) {
    var stream = bounce(route, { headers: { Connection: 'close' } });
    stream.on('error', function (err) {
      var res = bounce.respond();
      res.statusCode = 503;
      return res.end(getErrorPage('503 - Application offline', '503', 'Application offline'));
    });
  } else {
    var res = bounce.respond();
    res.statusCode = 404;
    return res.end(getErrorPage('404 - Application not found', '404', 'Application not found'));
  }
}).listen(80);
console.log('Proxy initialization completed');
