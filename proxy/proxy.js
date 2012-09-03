#!/usr/bin/env node

var Logger = require('bunyan')
  , log    = process.log = new Logger({name: "proxy::nodester"})
  , lib    = require('../lib/lib')
  , fs     = require('fs')
  , path   = require('path')
  , config = require('../config')
  , bouncy = require('bouncy')
  , https = false
  ;

// try {
//   var ssl = {
//     key: fs.readFileSync(config.opt.ssl_key_file, 'utf8'),
//     cert: fs.readFileSync(config.opt.ssl_cert_file, 'utf8')
//   };
// } catch (excp) {
//   https = false;
// }

log.info('Starting proxy initialization');

// Set some defaults in case that read process fail.
var proxymap = {
  "nodester.com":4001,
  "api.nodester.com":4001
};

// Avoid DDOS
var bannedIPs = [];

// Ghetto hack for error page
var getErrorPage = function (title, code, error) {
  var errorPage = '<html><head><title id="title">{title}</title></head><body><br/><br/><br/><br/><br/><center><img src="http://nodester.com/images/rocket-down.png" alt="logo" /><br/><h1 style ="color:#000;font-family:Arial,Helvetica,sans-serif;font-size:38px;font-weight:bold;letter-spacing:-2px;padding:0 0 5px;margin:0;">{code}</h1><h3 style ="color:#000;font-family:Arial,Helvetica,sans-serif;font-size:24px;font-weight:bold;padding:0 0 5px;margin:0;">{error}</h3></center></body></html>';
  return errorPage.replace(/\{title\}/gi, title)
                  .replace(/\{code\}/gi, code)
                  .replace(/\{error\}/gi, error)
};

//Update proxymap any time the routing file is updated
fs.watchFile(config.opt.proxy_table_file, function (oldts, newts) {
  fs.readFile(config.opt.proxy_table_file, function (err, data) {
    if (err) {
      log.info('Proxy map failed to update! (read)')
      throw err;
    } else {
      var old = JSON.parse(JSON.stringify(proxymap));
      try {
        proxymap = JSON.parse(data);
        log.info('Proxy map updated')
      } catch(e){
        log.warn(e)
        proxymap = old;
      }
    }
  });
});

function readIP (){
   return fs.readFile(__dirname + '/ips.json', function(err, data){
    if (err) {
      log.info('Can\'t load the ips (read)');
    } else {
      try {
        bannedIPs = data;
        log.info('ips updated');
      } catch (exc) {
        log.warn(exc);
      }
    }
  });
}

fs.watchFile(__dirname + '/ips.json', function(oldts, newts){
  return readIP();
});

readIP();

//Don't crash br0
process.on('uncaughtException', function (err) {
  log.fatal(err.stack);
  setTimeout(function(){
    process.kill(0)
  },150)
});


lib.update_proxytable_map(function (err) {
  if (err) {
    log.fatal('err writing initial proxy file: ' + JSON.stringify(err));
    throw err;
  } else {
    log.info('Initial Proxy file written successfully!');
  }
});

function proxy (req, bounce) {
  try {
    if (!req.headers.host) {
      var res = bounce.respond();
      res.statusCode = 400;
      return res.end(getErrorPage('400 - Invalid request', '400', 'Invalid request'));
    }
    var host = req.headers.host.replace(/:\d+$/, '');
    var route = proxymap[host] || proxymap[''];
    // log only urls that are not media files like public folders, css,js
    if (!path.extname(req.url)) {
      var ip = req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.client.remoteAddress
      if (bannedIPs.indexOf(ip) > -1) {
        var res = bounce.respond()
        res.statusCode = 509
        return res.end('Bandwith Limit Exceed')
      }
      log.info(host + ':' + route, ip);
    }
    req.on('error', function (err) {
      var res = bounce.respond();
      res.statusCode = 500;
      return res.end(getErrorPage('500 - Application error', '503', 'Application error'));
    });
    if (route) {
      // pass headers to the app
      delete req.headers.host; // avoiding infiny loops
      if (req.headers.connection) req.headers.connection = 'close';
      req.headers.Connection = 'close';
      var stream = bounce(route, req.headers);
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
  } catch(e){
    log.warn(e);
    var res = bounce.respond();
    res.statusCode = 500;
    return res.end(getErrorPage('500 - Application error', '503', 'Application error'));
  }
}


bouncy(proxy).on('error', function(){
  log.fatal('Bouncy goes nuts');
}).listen(80);

// if (https) {
//   log.info('Setting up https server');
//   bouncy(ssl, proxy).on('error', function(){
//     log.fatal('Bouncy goes nuts');
//   }).listen(433);
// }

log.info('Proxy initialization completed');
