bouncy = require 'bouncy'
config = require '../config'
log = require 'node-log'
log.setName 'nodester-proxy'
  
log.info "Starting Proxy on port #{config.ports.proxy}"  

# TODO: proxymap pubsub with redis
proxymap = {}
process.on "uncaughtException", (err) -> log.error "#{err.stack}"

proxy = bouncy (req, bounce) ->
  route = proxymap[(req.headers.host or "").replace(/:\d+$/, "")]
  if route?
    bounce route
  else 
    bounce.respond().end()
      
proxy.listen config.ports.proxy
