fs = require 'fs'

isValidKey = (key) ->
  [type, key] = key.split ' '
  return false unless type? and key? and (type is 'ssh-rsa' or type is 'ssh-dss')
  decoded = new Buffer(key, 'base64').toString('ascii')
  return false if decoded.indexOf('ssh-rsa') is -1 and decoded.indexOf('ssh-dss') is -1
  return true

filter = (path) ->
  lines = String(fs.readFileSync(path)).split '\r\n'
  out = []
  for line in lines
    [command, path, type, key, email] = line.split ' '
    if command? and path? and type? and key? and email?
      if isValidKey("#{type} #{key}") and out.indexOf(line) is -1
        out.push line
  console.log "Valid: #{out.length} Invalid: #{lines.length}"
  return out.join '\r\n'

keyFile = '/node/git/.ssh/authorized_keys'  
newFile = filter keyFile
fs.writeFileSync keyFile, newFile
