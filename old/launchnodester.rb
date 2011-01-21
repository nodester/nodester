#!/usr/bin/env ruby

# Run this app to stop and restart all Nodester jobs

require 'rubygems'
require 'json'

# Kill all node processes
# `killall node`
`sudo sh -c "killall node"`


# Launch Nodester
child_pid = fork do
  # Must be started with SUDO to run on port 80
  `sudo sh -c "/usr/local/bin/node proxy.js"`
  # `sudo sh -c "/usr/local/bin/nodemon proxy.js"`
  # `sudo sh -c "/usr/local/bin/forever proxy.js"`
end
Process.detach(child_pid)

child_pid = fork do
  `nodemon app.js`  
end
Process.detach(child_pid)


# Launch Apps 
require 'rest-client'
res = RestClient.get 'http://nodefu:glitter@nodefu.couchone.com/apps/_design/nodeapps/_view/all', {:accept => :json}

# server = Couch::Server.new("nodefu.couchone.com", "80")
# res = server.get('/apps/_design/nodeapps/_view/all')

jsonresp = res.body
dbdata = JSON.parse(jsonresp)
nodesterdir = Dir.pwd
dbdata["rows"].each do |app|
  begin
    child_pid = fork do
      begin
        Dir.chdir("apps/#{app["value"]["_rev"]}") 
        # Dir.chdir("apps/#{app["value"]["_id"]}") 
        `nodemon #{app["value"]["start"]}`
        Dir.chdir("../..")
        puts app["value"]["_id"] + ' : ' + app["value"]["_rev"]  + ' : ' + app["value"]["start"] 
        # puts app["value"]["_id"] + ' : ' + app["value"]["_id"]  + ' : ' + app["value"]["start"] 
      rescue Exception => e
        Dir.chdir(nodesterdir)
      end
    end
    Process.detach(child_pid)
  rescue Exception => e
    Dir.chdir(nodesterdir)
  end
  
  
end

puts "Nodester launched - HiYah!"

exit
# res = server.put("/imsms/phonosdk", '{ "jid":"' + jid.to_s + '", "_rev":"' + dbdata["_rev"].to_s + '" }')

