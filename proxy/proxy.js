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

httpProxy.createServer(function (req, res, proxy) {  
  var hostname = req.headers.host;
  var subdomain = hostname.toLowerCase().substring(0,hostname.indexOf("."));
  if (hostname.indexOf("nodefu") != -1) {
    res.writeHead(301, {'Content-Type': 'text/plain', 'Location': 'http://nodester.com'});
    res.end();
  } else if (hostname == config.opt.api_dom) {
    // API Domain
    if(req.headers.authorization == undefined) {
      res.writeHead(401, {'Content-Type': 'text/plain', 'WWW-Authenticate': 'Basic'});
      res.end('password?\n');
    } else {
      proxy.proxyRequest(4001, '127.0.0.1');
    };
  } else if (hostname != config.opt.tl_dom && subdomain != '' && subdomain != 'www' && hostname != '127.0.0.1') {
    request({uri:couch_loc + 'apps/' + subdomain, method:'GET', headers:h}, function (err, response, body) {
      var doc = JSON.parse(body);	
      if (doc) {
        if (doc.running == 'true') {
          proxy.proxyRequest(doc.port, '127.0.0.1');
        } else {
          res.writeHead(503, {'Content-Type': 'text/plain'});
          res.end('app is not running');
        }
      } else {
        res.writeHead(503, {'Content-Type': 'text/plain'});
        res.end('app does not exist');
      }
    });
  } else {
    // Serve the site.
    proxy.proxyRequest(4001, '127.0.0.1');
  };
}).listen(80);
sys.puts('Nodester started on port 80');

daemontools.setreuid_username(config.opt.username);

process.on('uncaughtException', function (err) {
  console.log(err);
});
