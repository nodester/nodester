/*

Nodester - Nodejs hosting
This app runs on port 80 and forwards traffic to the appropriate node app 

*/

var httpProxy = require('http-proxy'),
    url = require('url'),
    sys = require('sys'),
    daemontools = require('daemon-tools');

var request = require('request');
var h = {accept:'application/json', 'content-type':'application/json'};

var config = require("../config");
var couch_loc = "http://" + config.opt.couch_user + ":" + config.opt.couch_pass + "@" + config.opt.couch_host + ":" + config.opt.couch_port + "/";
if (config.opt.couch_prefix.length > 0) {
  couch_loc += config.opt.couch_prefix + "_";
}

var handle_incoming = function (req, res, proxy, websocket) {
  if (typeof req.headers.host != 'undefined') {
    var hostname = req.headers.host.toLowerCase();;
    var first_point = hostname.indexOf(".");
    var subdomain = hostname.substring(0, first_point);
    var restdom = hostname.substring(first_point + 1);
    if (hostname.indexOf("nodefu") != -1 && websocket == false) {
      res.writeHead(301, {'Content-Type': 'text/plain', 'Location': 'http://nodester.com'});
      res.end();
    } else if (hostname == config.opt.api_dom) {
      // API Domain
      proxy.proxyRequest(4001, '127.0.0.1');
    } else if (hostname != config.opt.tl_dom && (restdom == config.opt.tl_dom && subdomain != '' && subdomain != 'www' && hostname != '127.0.0.1')) {
      request({uri:couch_loc + 'apps/' + subdomain, method:'GET', headers:h}, function (err, response, body) {
        var doc = JSON.parse(body);
        if (doc) {
          if (doc.running == 'true') {
            if (typeof websocket != 'undefined' && websocket == true) {
              proxy.proxyWebSocketRequest(doc.port, '127.0.0.1', req.headers.host);
            } else {
              proxy.proxyRequest(doc.port, '127.0.0.1');
            }
          } else {
            if (websocket == false) {
              res.writeHead(503, {'Content-Type': 'text/plain'});
              res.end('app is not running');
            } else {
              // Not sure here!
            }
          }
        } else {
          if (websocket == false) {
            res.writeHead(503, {'Content-Type': 'text/plain'});
            res.end('app does not exist');
          } else {
            // Not sure here!
          }
        }
      });
    } else {
      // Look up hosted domains
      request({uri:couch_loc + 'aliasdomains/' + hostname, method:'GET', headers:h}, function (err, response, body) {
        var doc = JSON.parse(body);
        if (doc) {
          if (typeof doc.error != 'undefined' && doc.error == "not_found") {
            proxy.proxyRequest(4001, '127.0.0.1');
          } else if (typeof doc.appname != 'undefined') {
            request({uri:couch_loc + 'apps/' + doc.appname, method:'GET', headers:h}, function (err, response, body) {
              var doc = JSON.parse(body);	
              if (doc) {
                if (doc.running == 'true') {
                  if (typeof websocket != 'undefined' && websocket == true) {
                    proxy.proxyWebSocketRequest(doc.port, '127.0.0.1', req.headers.host);
                  } else {
                    proxy.proxyRequest(doc.port, '127.0.0.1');
                  }
                } else {
                  if (websocket == false) {
                    res.writeHead(503, {'Content-Type': 'text/plain'});
                    res.end('app is not running');
                  } else {
                    // Not sure here!
                  }
                }
              } else {
                if (websocket == false) {
                  res.writeHead(503, {'Content-Type': 'text/plain'});
                  res.end('app does not exist');
                } else {
                  // Not sure here!
                }
              }
            });
          } else {
            proxy.proxyRequest(4001, '127.0.0.1');
          }
        }
      });
    }
  } else {
    proxy.proxyRequest(4001, '127.0.0.1');
  }
};

var prox = httpProxy.createServer(function (req, res, proxy) {
  handle_incoming(req, res, proxy, false);
});
prox.addListener('upgrade', function (req, sock, head) {
  var proxy = new httpProxy.HttpProxy(req, sock, head);
  handle_incoming(req, undefined, proxy, true);
});
prox.listen(80);
sys.puts('Nodester started on port 80');

daemontools.setreuid_username(config.opt.username);

process.on('uncaughtException', function (err) {
  console.log(err);
});
