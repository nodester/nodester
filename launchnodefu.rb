#!/usr/bin/env ruby
require 'rubygems'
require 'net/http'
require 'json'

# Couch DB Commands
module Couch

  class Server
    def initialize(host, port, options = nil)
      @host = host
      @port = port
      @options = options
    end

    def delete(uri)
      request(Net::HTTP::Delete.new(uri))
    end

    def get(uri)
      request(Net::HTTP::Get.new(uri))
    end

    def put(uri, json)
      req = Net::HTTP::Put.new(uri)
      req["content-type"] = "application/json"
      req.body = json
      request(req)
    end

    def post(uri, json)
      req = Net::HTTP::Post.new(uri)
      req["content-type"] = "application/json"
      req.body = json
      request(req)
    end

    def request(req)
      res = Net::HTTP.start(@host, @port) { |http|http.request(req) }
      unless res.kind_of?(Net::HTTPSuccess)
        handle_error(req, res)
      end
      res
    end

    private

    def handle_error(req, res)
      e = RuntimeError.new("#{res.code}:#{res.message}\nMETHOD:#{req.method}\nURI:#{req.path}\n#{res.body}")
      raise e
    end
  end
end

# Kill all node processes
`killall node`


# Launch NodeFu
child_pid = fork do
  # Must be started with SUDO to run on port 80
  `sudo sh -c "/usr/local/bin/nodemon proxy.js"`
end
Process.detach(child_pid)

child_pid = fork do
  `nodemon app.js`  
end
Process.detach(child_pid)


# Launch Apps 
server = Couch::Server.new("nodefu.couchone.com", "80")

res = server.get('/apps/_design/nodeapps/_view/all')
jsonresp = res.body
dbdata = JSON.parse(jsonresp)
nodefudir = Dir.pwd
dbdata["rows"].each do |app|
  begin
    child_pid = fork do
      begin
        Dir.chdir("apps/#{app["value"]["_rev"]}") 
        `nodemon #{app["value"]["start"]}`
        Dir.chdir("../..")
        puts app["value"]["_id"] + ' : ' + app["value"]["_rev"]  + ' : ' + app["value"]["start"] 
      rescue Exception => e
        Dir.chdir(nodefudir)
      end
    end
    Process.detach(child_pid)
  rescue Exception => e
    Dir.chdir(nodefudir)
  end
  
  
end

puts "NodeFu launched - HiYah!"

exit
# res = server.put("/imsms/phonosdk", '{ "jid":"' + jid.to_s + '", "_rev":"' + dbdata["_rev"].to_s + '" }')

