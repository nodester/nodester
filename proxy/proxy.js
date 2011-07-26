#!/usr/bin/env node

/*

Nodester - Nodejs hosting
This app runs on port 80 and forwards traffic to the appropriate node app 

*/

var httpProxy = require('../deps/node-http-proxy/node-http-proxy.js'),
    http = require('http'),
    https = require('http'),
    net = require('net'),
    policyfile = require('policyfile'),
    url = require('url'),
    fs = require('fs'),
    path = require('path'),
    lib = require('../lib/lib'),
    exec = require('child_process').exec,
    config = require('../config');

require.paths.unshift(path.join(config.app_dir, '../', '.node_libraries'));

var daemon = require('daemon');

var proxy = new httpProxy.HttpProxy();
var proxymap = {};
var proxy_refresh_timer = null;

var queue_proxy_map_refresh = function() {
  if (proxy_refresh_timer === null) {
    proxy_refresh_timer = setTimeout(function() {
      load_proxymap(config.opt.proxy_table_file, function(err, res) {
        if (err) {
          console.error('failed to load proxymap: %s', err.toString());
        }
        proxy_refresh_timer = null;
      });
    }, 5 * 1000);
  }
};

fs.watchFile(config.opt.proxy_table_file, function(oldts, newts) {
  queue_proxy_map_refresh();
});

var load_proxymap = function(fname, cb) {
  fs.readFile(fname, function(err, data) {
    if (err) {
      console.error('load_proxymap read error: %s', err.toString());
      cb(err, undefined);
    } else {
      try {
        var map = JSON.parse(data);
        if (typeof map.router != 'null') {
          proxymap = {};
          for (var i in map.router) {
            if (map.router.hasOwnProperty(i)) {
              var prts = map.router[i].split(':');
              proxymap[i] = {
                host: prts[0],
                port: prts[1]
              };
            }
          }
          cb(undefined, true);
        } else {
          cb('no_map_defined', undefined);
        }
      } catch (e) {
        console.error('load_proxymap parse error: %s', e.toString());
        cb(e, undefined);
      }
    }
  });
};

var lookup_hostport = function(hostport) {
  if (proxymap.hasOwnProperty(hostport)) {
    return proxymap[hostport];
  } else if (hostport.indexOf(':') > -1) {
    var prts = hostport.split(':');
    if (proxymap.hasOwnProperty(prts[0])) {
      return proxymap[prts[0]];
    } else {
      return null;
    }
  } else {
    return null;
  }
};

var handle_http_request = function(req, res) {
  if (typeof req.headers.host == 'string') {
    if (req.headers.host == 'nodefu.com' || req.headers.host == 'www.nodefu.com') {
      res.writeHead(301, {Location: 'http://nodester.com'});
      res.end();
    } else {
      var options = lookup_hostport(req.headers.host);
      if (options !== null) {
        req.headers['x-forwarded-for'] = req.connection.remoteAddress || req.connection.socket.remoteAddress;
        req.headers['x-forwarded-port'] = req.connection.remotePort || req.connection.socket.remotePort;
        req.headers['x-forwarded-proto'] = res.connection.pair ? 'https' : 'http';
        options['allow_xforwarded_headers'] = false;
        proxy.proxyRequest(req, res, options);
      } else {
        res.writeHead(404, {
          'Content-Type': 'text/plain'
        });
        res.end('hostname not known');
      }
    }
  } else {
    res.writeHead(406, {
      'Content-Type': 'text/plain'
    });
    res.end('no hostname in request');
  }
};

var handle_upgrade_request = function(req, socket, head) {
  if (typeof req.headers.host == 'string') {
    var options = lookup_hostport(req.headers.host);
    if (options !== null) {
      req.headers['x-forwarded-for'] = req.connection.remoteAddress || req.connection.socket.remoteAddress;
      req.headers['x-forwarded-port'] = req.connection.remotePort || req.connection.socket.remotePort;
      proxy.proxyWebSocketRequest(req, socket, head, options);
    } else {
      socket.end();
      socket.destroy();
    }
  } else {
    socket.end();
    socket.destroy();
  }
};


var switch_user = function() {
  var child = exec('id -u ' + config.opt.userid, function(err, stdout, stderr) {
    daemon.setreuid(parseInt(stdout, 10));
    console.log('Switched to ' + process.getuid() + '.');
  });
};

lib.update_proxytable_map(function(err) {
  if (err) {
    console.log("err: " + JSON.stringify(err));
  } else {
    queue_proxy_map_refresh();
    var http_server = http.createServer(handle_http_request);
    http_server.on('upgrade', handle_upgrade_request);
    http_server.listen(80, '0.0.0.0');
    console.log('Nodester started on port 80');
    var flash_server = policyfile.createServer();
    flash_server.listen(843);
    console.log('Flash Policy Server started on port 843.');
    if (config.opt.enable_ssl === true) {
      var https = require('https');
      var options = {
        ca: fs.readFileSync(config.opt.app_dir + '/' + config.opt.ssl_ca_file),
        key: fs.readFileSync(config.opt.app_dir + '/' + config.opt.ssl_key_file),
        cert: fs.readFileSync(config.opt.app_dir + '/' + config.opt.ssl_cert_file)
      };
      var httpSsl = https.createServer(options, function(req, res) {
        var proxy = new httpProxy.HttpProxy(req, res);
        proxy.proxyRequest(4001, "127.0.0.1", req, res);
      });
      httpSsl.setMaxListeners(1000);
      httpSsl.listen(443);
      console.log('Nodester API/WWW started on port 443'); // We need SNI in node.js
      switch_user();
    } else {
      switch_user();
    }
    console.log('Nodester started on port 80');
  }
});

process.on('uncaughtException', function(err) {
  console.log(err.stack);
});