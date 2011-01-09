#!/usr/bin/env ruby
require 'rubygems'
require 'json'
require 'net/http'

class MethodTable # returns JSON hash containing all NPM modules available
def get_table
url = "http://registry.npmjs.org"
url = URI.parse(url)
method_list = Net::HTTP.get(url)
end
end

method_table = MethodTable.new
table = method_table.get_table
table = JSON.parse(table)

table.each do |i|
  puts "nmp install #{i[0]}"
  # system 'npm install #{i[0]}' rescue nil
  `npm install #{i[0]}` rescue nil
end