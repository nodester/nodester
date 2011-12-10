snapi = require 'snapi'
config = require '../config'
log = require 'node-log'
log.setName 'nodester-api'

log.info "Starting API on port #{config.ports.api}"
process.on "uncaughtException", (err) -> log.error "#{err.stack}"
snapi.run config.paths.api, config.ports.api
