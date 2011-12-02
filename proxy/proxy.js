#!/usr/bin/env node

var lib = require('../lib/lib'),
    fs = require('fs'),
    config = require('../config'),
    bouncy = require('bouncy');

console.log('Starting proxy initialization');

var proxymap = {};

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
    var host = (req.headers.host || '').replace(/:\d+$/, '');
    var route = proxymap[host] || proxymap[''];

    if (route) {
        bounce(route, { headers: { Connection: 'close' } });
    } else {
        var res = bounce.respond();
        res.statusCode = 404;
        res.end();
    }
}).listen(80);
console.log('Proxy initialization completed');
