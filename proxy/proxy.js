#!/usr/bin/env node

var Logger = require('bunyan')
  , log    = process.log = new Logger({name: "proxy::nodester"})
  , lib    = require('../lib/lib')
  , fs     = require('fs')
  , path   = require('path')
  , config = require('../config')
  , bouncy = require('bouncy')
  ;



log.info('Starting proxy initialization');

// Set some defaults in case that read process fail.
var proxymap = {
  "nodester.com":4001,
  "api.nodester.com":4001
};

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
      try {
        proxymap = JSON.parse(data);
        log.info('Proxy map updated')
      } catch(e){
        log.warn(e)
      }
      
    }
  });
});

//Don't crash br0
process.on('uncaughtException', function (err) {
  log.fatal(err.stack);
  /*
   * Write to a specific file errors, this is useful when your restart script
   * respawn the process and delete the logs, becuase an uE
  */
  var slog = fs.createWriteStream(path.join(config.opt.logs_dir + 'proxyerror.log'), {'flags': 'a'});
  slog.write('\n<-- new error -->\n');
  slog.end('\n' + err.message + '\n' + err.stack +'\n')
  setTimeout(function(){
    //let the process write the log
    process.kill(0)
  },150)
});



//Pulls out DB records and puts them in a routing file
lib.update_proxytable_map(function (err) {
  if (err) {
    log.fatal('err writing initial proxy file: ' + JSON.stringify(err));
    throw err;
  } else {
    log.info('Initial Proxy file written successfully!');
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
  // log only urls that are not media files like public folders, css,js
  if (!path.extname(req.url))
    log.info(host + ':' + route);
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

log.info('Proxy initialization completed');
