#!/usr/bin/env node

var http = require('http'),
    config = require('../../config');

require('colors');

var delete_couchdb_table = function (port, hostname, tablename, callback) {
    var co = http.createClient(port, hostname);
    var req = co.request('DELETE', '/' + tablename, {
        host: hostname,
        'Authorization': "Basic " + (new Buffer(config.opt.couch_user + ":" + (config.opt.couch_pass || ""))).toString('base64')
    });
    var rtv = false;
    req.end();
    req.on('response', function (resp) {
        switch (resp.statusCode) {
            case 200:
                rtv = true;
            break;
        }
        callback(rtv);
    });
};

for(var i in config.opt.couch_tables) {
    var tabname = config.opt.couch_tables[i];
    if (config.opt.couch_prefix) {
        tabname = config.opt.couch_prefix + "_" + tabname;
    }
    (function (table_name) {
        delete_couchdb_table(config.opt.couch_port, config.opt.couch_host, table_name, function (success) {
            if (success) {
                console.log((table_name + " was deleted.").yellow);
            } else {
                console.log((table_name + " failed to be deleted.").red.bold);
            }
        });
    })(tabname);
}
