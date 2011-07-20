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

var prefix = '';
if (config.opt.couch_prefix.length > 0) {
  prefix = config.opt.couch_prefix + '_';
}

var all_views = [
  {
    table: 'apps',
    design: 'nodeapps',
    views: {
      all: { map: function(doc) { emit(doc.username, doc);} }
    }
  },
  {
    table: 'aliasdomains',
    design: 'aliasdomains',
    views: {
      all: { map: function(doc) { emit(doc.username, doc);} }
    }
  }
];

for (var i in all_views) {
    (function(view) {
      var db = conn.database(prefix + view.table);
      db.view(view.design + '/all', function (err, res) {
        if (err) {
          if (err.error == 'not_found') {
            db.save('_design/' + view.design, view.views, function (err, res) {
              if (err) {
                console.error('Failed to create view ' + view.table + '/' + view.design + '.'.red().bold());
                console.error('  ' + err.toString().red());
              } else {
                console.log('Created view ' + view.table + '/' + view.design + '.'.yellow());
              }
            });
          } else {
            console.error('Failed to query view ' + view.table + '/' + view.design + '.'.red().bold());
            console.error('  ' + err.toString().red());
          }
        } else {
          console.log('Skipping creating view ' + view.table + '/' + view.design + '.'.yellow());
        }
      });
    })(all_views[i]);
}


//Default Port Number:
var db = conn.database(prefix + 'nextport');
var default_port = 10000;
db.get('port', function (err, resp) {
  if (err) {
    if (err.error == 'not_found') {
      db.save('port', {address: default_port}, function (err, resp) {
        if (err) {
          console.error('Error saving next port:'.red());
          console.error('  ' + (err).red());
        } else console.log('Next port initialised.'.yellow());
      });
    } else {
      console.error('Unknown error working on next port:'.red());
      console.error('  ' + (err).red());
    }
  } else {
    console.log('Skipping next port initialisation.'.yellow());
  }
});
// {address: 10000}
