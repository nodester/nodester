fs = require 'fs'
bouncy = require 'bouncy'
lib = require '../lib/lib'
config = require '../config'
proxymap = {}

# Update proxymap any time the routing file is updated
fs.watchFile config.opt.proxy_table_file, (oldts, newts) ->
  fs.readFile config.opt.proxy_table_file, (err, data) -> 
    throw err if err else proxymap = JSON.parse data

process.on "uncaughtException", (err) -> console.log "Uncaught error: #{err.stack}"
lib.update_proxytable_map (err) -> throw err if err

bouncy((req, bounce) ->
  route = proxymap[(req.headers.host or "").replace(/:\d+$/, "")]
  bounce route, headers: Connection: "close" if route else bounce.respond().end()
).listen 80
