#!/usr/bin/env node

sys.puts('Starting proxy initialization');

var lib = require('../lib/lib'),
    fs = require('fs'),
    sys = require('sys'),
    config = require('../config')
    bouncy = require('bouncy'),;

var proxymap = {};

// Ghetto hack
var errorPage = '<html><head><title id="title">{title}</title></head><body><br/><br/><br/><br/><br/><center><img src="http://nodester.com/images/rocket-md-right.png" alt="logo" /><br/><h1 style ="color:#000;font-family:Arial,Helvetica,sans-serif;font-size:38px;font-weight:bold;letter-spacing:-2px;padding:0 0 5px;margin:0;">{code}</h1><h3 style ="color:#000;font-family:Arial,Helvetica,sans-serif;font-size:24px;font-weight:bold;padding:0 0 5px;margin:0;">{error}</h3></center></body></html>';
var getErrorPage = function (title, code, error) {
        return errorPage.replace('{title}', title).replace('{code}', code).replace('{error}', error);
};

//Update proxymap any time the routing file is updated
fs.watchFile(config.opt.proxy_table_file, function (oldts, newts) {
    proxymap = JSON.parse(newts);
    sys.puts('Proxy map updated');
});

//Don't crash br0
/*
process.on('uncaughtException', function (err) {
    sys.puts('Uncaught proxy error: ' + sys.inspect(err));
});
*/

// Pulls out DB records and puts them in a routing file
lib.update_proxytable_map(function (err) {
    if (err) {
        sys.puts('err writing initial proxy file: ' + JSON.stringify(err));
    } else {
        sys.puts('Initial Proxy file written successfully!');
    }
});

bouncy(function (req, bounce) {
    var host = (req.headers.host || '').replace(/:\d+$/, '');
    var route = proxymap[host] || proxymap[''];
    
    if (route) {
        bounce(route);
    } else {
        var res = bounce.respond();
        res.statusCode = 404;
        res.write(getErrorPage('404 - Application not found!', '404', 'Application does not exist'));
        res.end();
    }
}).listen(80);
sys.puts('Proxy initialization completed');
