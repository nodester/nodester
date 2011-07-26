var cradle = require('cradle');
var lib = require('./lib');
var sys = require('sys');
var config = require('../config');

var logger = function(app_name) {};
logger.prototype.setup = function(app_name, cb) {
  var self = this;
  self.app_name = app_name;
  self.curr_id = null;
  self.conn = new cradle.Connection({
    host: config.opt.couch_host,
    port: config.opt.couch_port,
    auth: {
      user: config.opt.couch_user,
      pass: config.opt.couch_pass
    },
    options: {
      cache: false,
      raw: false
    }
  });
  self.db = self.conn.database(lib.couch_prefix + 'logs');
  self.db.get(self.app_name + '_position', function(err, doc) {
    if (err) {
      if (err.error == 'not_found') {
        self.curr_id = 1;
        cb(null);
      } else {
        cb(err);
      }
    } else {
      self.curr_id = parseInt(doc.current_id, 10);
      cb(null);
    }
  });
};
logger.prototype.log = function(message, cb) {
  var self = this;
  if (self.curr_id !== null) {
    self.db.save(self.app_name + '_' + self.curr_id, {
      message: message
    }, function(err, res) {
      if (err !== null) {
        cb(err);
      } else {
        self.curr_id++;
        self.db.save(self.app_name + '_position', {
          current_id: self.curr_id
        }, function(err, res) {
          if (err !== null) {
            cb(err);
          } else {
            cb(null);
          }
        });
      }
      // console.log(err);
      // console.log(res);
    });
  } else {
    cb("Error: curr_id == null");
  }
};

exports.logger = logger;