#!/usr/bin/env node

require.paths.unshift('/usr/lib/node_modules/');
var http = require('http'),
    config = require("../config"),
    util = require('util'),
    exec = require('child_process').exec,
    app = require('../lib/app');

require('colors');

var action = process.argv[2],
    all = false,
    this_repo = false,
    past = '';


if (process.argv[3] && process.argv[3].toLowerCase() === 'all') {
    all = true;
} else if (process.argv[3]) {
    all = false;
    this_repo = process.argv[3];
}

switch (action) {
    case 'start':
        verb = 'Starting'.green;
        past = 'started';
        break;
    case 'stop':
        verb = 'Stopping'.red.bold;
        past = 'stopped';
        break;
    default:
        action = 'restart';
        verb = 'Restarting'.yellow;
        past = 'restarted';
        break;
}

var couch_http = http.createClient(config.opt.couch_port, config.opt.couch_host);
if (config.opt.couch_prefix.length > 0) {
  var cprefix = config.opt.couch_prefix + '_';
} else {
  var cprefix = '';
}

// var request = couch_http.request(
//   'GET',
//   '/' + cprefix + 'apps' + '/_design/nodeapps/_view/all',
//   {
//     'host': config.opt.couch_host,
//     'Authorization': "Basic " + base64_encode(new Buffer(config.opt.couch_user + ":" + (config.opt.couch_pass || "")))
//   }
// );

// NATIVE BASE64 HANDLING
var buff = new Buffer(config.opt.couch_user + ':' + config.opt.couch_pass, encoding='ascii');
var dbcreds = buff.toString('base64');
var request = couch_http.request(
  'GET',
  '/' + cprefix + 'apps' + '/_design/nodeapps/_view/all',
  {
    'host': config.opt.couch_host,
    'Authorization': "Basic " + dbcreds || ""
  }
);


request.end();
request.on('response', function (response) {
  var buff = '';
  if (response.statusCode != 200) {
    util.log(response.statusCode);
    util.log('Error: Cannot query CouchDB');
    process.exit(1);
  }
  response.setEncoding('utf8');
  response.on('data', function (chunk) {
    buff += chunk;
  });
  response.on('end', function () {
    var resp = JSON.parse(buff);
    start_running_apps(resp.rows);
  });
});

var apps = [], count = 0, g = 0, f = 0,
    good = "✔", bad = "✖";

console.log = function() {}; //Commenting this out so the debugging from ../lib/app doesn't display

var next = function() {
    if (apps.length) {
        var len = apps.length;
        var doc = apps.pop();
        util.print(verb + ' (' + len + '): [' + (doc.username + '/' + doc.repo_id + '/' + doc.start + ':' + doc.port).blue + ']');
        var method = 'app_' + action;
        app[method]({
            query: {
                repo_id: doc.repo_id,
                restart_key: config.opt.restart_key
            }
        }, {
            send: function(data) {
                if (data instanceof Object) {
                    if (data.status.indexOf('failed') > -1) {
                        f++;
                    } else {
                        g++;
                    }
                    util.print(' [' + ((data.status.indexOf('failed') > -1) ? bad.red.bold : good.bold.green) + ']\n');
                } else {
                    g++;
                    util.print(' [' + '!!'.yellow.bold + ']\n');
                }
                //Let the process fire up and daemonize before starting the next one
                setTimeout(next, 500);
            }
        });
        
    } else {
        util.log(('All ' + count + ' apps ' + past).bold);
        util.log(g + ' apps ' + past + ' successfully');
        if (f) {
            util.log((f + ' apps failed to ' + action).red.bold);
        }
    }
};

var start_running_apps = function (apps_arr) {
    for(var i in apps_arr) {
        var doc = apps_arr[i].value;
        if (this_repo) {
            if (doc.repo_id == this_repo) {
                count++;
                apps.push(doc);
            }
        } else {
            if (doc.running == 'true' || all) {
                count++;
                apps.push(doc);
            }
        }
    }
    if (all) {
        util.log(verb + ' ALL (' + count + ') apps..');
    } else {
        util.log(verb + ' ' + count + ' apps..');
    }
    next();
};

