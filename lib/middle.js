var request = require('request'),
    config = require('./config');


/**
* Dynamic express route to authenticate a user from CouchDB
*/
var authenticate = function(req, res, next) {
    var basicauth = req.headers.authorization;

    if (typeof basicauth != 'undefined' && basicauth.length > 0) {
        var buff = new Buffer(basicauth.substring(basicauth.indexOf(" ") + 1 ), encoding='base64');
        var creds = buff.toString('ascii')

        var username = creds.substring(0,creds.indexOf(":"));
        var password = creds.substring(creds.indexOf(":")+1);

        request({uri: config.couch_loc + 'nodefu/' + username, method:'GET', headers: config.couch_headers }, function (err, response, body) {
            var doc = JSON.parse(body);
            if (doc && doc._id == username && doc.password == config.md5(password)) {
                req.user = doc;
                next();
            } else {
                // basic auth didn't match account
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.write('{"status" : "failure - authentication"}\n');
                res.end();
            }
        });
    } else {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.write('{"status" : "failure - authentication"}\n');
        res.end();
    }
};

/**
* Use CouchDB to get repo information, this route must come AFTER middle.authenticate
*/
var authenticate_app = function(req, res, next) {
    //GET Request
    var appname = req.params.appname;
    //POST|DELETE|PUT requests
    if (!appname && req.body.appname) {
        appname = req.body.appname;
    }
    if (appname) {
        appname = appname.toLowerCase();
    }

    if (req.user) {
        request({ method: 'GET', uri: config.couch_loc + 'apps/' + appname, headers: config.couch_headers }, function (err, response, body) {
            var doc = JSON.parse(body);
            if (doc && doc.username == req.user._id) {
                req.appname = appname;
                req.repo = req.app = doc;
                next();
            } else {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end('{"status" : "failure - app not found"}\n');
            }
        });
    } else {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end('{"status" : "failure - authentication"}\n');
    }
};


module.exports.authenticate = authenticate;
module.exports.authenticate_app = authenticate_app;
/*
* Generic request error handler.
*/
module.exports.error = function() {
    return function(req, res, next) {
        res.error = function(code, message) {
            res.writeHead(code, { 'Content-Type': 'application/json' });
            res.write(JSON.stringify({ status: message }));
            res.end();
        };
        next();
    }
}
