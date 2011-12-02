cradle = require 'cradle'
config = require '../config'

unless connection
  connection = new cradle.Connection
    config.opt.couch_host, config.opt.couch_port, {auth: {username: config.opt.couch_user, password: config.opt.couch_pass}}

module.exports = connection
