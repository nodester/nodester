#!/usr/bin/env node

var cradle = require('cradle'),
    config = require('../../config');

var Cols = require('coloured');
Cols.extendString();

var c_opts = {
  cache: false,
  raw: false
};
if (config.opt.couch_user.length > 0 && config.opt.couch_pass.length > 0) {
  c_opts['auth'] = {username: config.opt.couch_user, password: config.opt.couch_pass};
}
var proto = 'http';
if (config.opt.couch_port == 443) {
  c_opts['secure'] = true;
  proto = 'https';
}

var conn = new(cradle.Connection)(proto + '://' + config.opt.couch_host, 5984, c_opts);

for(var i in config.opt.couch_tables) {
    var tabname = config.opt.couch_tables[i];
    if (config.opt.couch_prefix.length > 0) {
        var tabname = config.opt.couch_prefix + "_" + tabname;
    }
    (function (table_name) {
      var db = conn.database(table_name);
      db.create(function (err, res) {
        if (err) {
          console.error(('Failed to create ' + table_name + '.').red().bold());
          console.error('  ' + err.reason.red());
        } else {
          console.log(('Created ' + table_name + '.').yellow());
        }
      });
    })(tabname);
}
