#!/usr/bin/env node

var http = require('http');
var config = require("../../config");
var sys = require('sys');
var request = require('request');

var h = { accept:'application/json', 'content-type':'application/json' };

var couch_loc = "http:/"+"/" + config.opt.couch_user + ":" + config.opt.couch_pass + "@" + config.opt.couch_host + ":" + config.opt.couch_port + "/";
if (config.opt.couch_prefix) {
    couch_loc += config.opt.couch_prefix + "_";
}
var all_views = [
    {
        uri: couch_loc + 'apps' + '/_design/nodeapps',
        design: {
            "language": "javascript",
            "views": {
                "all": {
                    "map": "function(doc) { emit(doc.username, doc);}"
                }
            }
        }
    },
    {
        uri: couch_loc + 'aliasdomains' + '/_design/aliasdomains',
        design: {
            "language": "javascript",
            "views": {
                "all": {
                    "map": "function(doc) { emit(doc.username, doc);}"
                }
            }
        }
    }
];

for (var i in all_views) {
    var all_view_uri = all_views[i].uri;
    var design_document = all_views[i].design;
    (function(uri, doc) {
        request({
            uri: uri,
            method:'GET',
            headers:h
        }, function (err, response, body) {
            if (response.statusCode == 404) {
                request({
                    uri: uri,
                    method:'PUT',
                    headers:h,
                    body: JSON.stringify(doc)
                }, function (err, response, body){
                    if (response.statusCode == 201) {
                        console.log(uri + " : all view created");
                    } else {
                        console.log(sys.inspect(body));
                        console.log(sys.inspect(err));
                    }
                });
            } else {
                var org_doc = JSON.parse(body);
                doc._rev = org_doc._rev;
                request({
                    uri: uri + '?rev=' + doc._rev,
                    method:'PUT',
                    headers: h,
                    body: JSON.stringify(doc)
                }, function (err, response, body){
                    if (response.statusCode == 201) {
                        console.log(uri + ": all view updated");
                    } else {
                        console.log(sys.inspect(body));
                        console.log(sys.inspect(err));
                    }
                });
            }
        });

    })(all_view_uri, design_document);
}

//Default Port Number:
request({
    uri: couch_loc + 'nextport',
    method:'GET',
    headers: h
}, function (err, response, body) {
    var doc = JSON.parse(body);
    if (doc.doc_count === 0) {
        request({
            uri: couch_loc + 'nextport/port',
            method:'PUT',
            headers: h,
            body: JSON.stringify({ address: 8000 })
        }, function (err, response, body) {
            var body = JSON.parse(body);
            if (body.ok) {
                console.log('First port number set');
            } else {
                console.log(body);
            }
        });
    } else {
        console.log('Skipped first port, doc exists');
    }
});
