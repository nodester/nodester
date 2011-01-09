#!/usr/bin/env ruby
require 'rubygems'
require 'net/http'
require 'json'

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

server = Couch::Server.new("nodefu.couchone.com", "80")

res = server.get('/apps/_design/nodeapps/_view/all')
jsonresp = res.body
dbdata = JSON.parse(jsonresp)
nodefudir = Dir.pwd
dbdata["rows"].each do |app|
  begin
    child_pid = fork do
      Dir.chdir("apps/#{app["value"]["_rev"]}")
      `nodemon #{app["value"]["start"]}`
      Dir.chdir("../..")
      puts app["value"]["_id"] + ' : ' + app["value"]["_rev"]  + ' : ' + app["value"]["start"] 
    end
    Process.detach(child_pid)
  rescue Exception => e
    Dir.chdir(nodefudir)
  end
  
  
end

exit
# res = server.put("/imsms/phonosdk", '{ "jid":"' + jid.to_s + '", "_rev":"' + dbdata["_rev"].to_s + '" }')

