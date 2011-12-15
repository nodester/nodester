fs = require 'fs'
{existsSync, normalize} = require 'path'

isValidKey = (key) ->
  [type, key] = key.split ' '
  return false unless type? and key? and (type is 'ssh-rsa' or type is 'ssh-dss')
  decoded = new Buffer(key, 'base64').toString('ascii')
  return false if decoded.indexOf('ssh-rsa') is -1 and decoded.indexOf('ssh-dss') is -1
  return true

filter = (path) ->
  lines = String(fs.readFileSync(path)).split '\n'
  out = []
  for line in lines
    [command, path, type, key, email] = line.split ' '
    if command? and path? and type? and key? and email?
      if isValidKey("#{type} #{key}") and out.indexOf(line) is -1
        [nothing, base, git, username] = path.split '/'
        username = username.split('",')[0]
        userPath = "/#{base}/#{git}/#{username}/"
        if existsSync normalize userPath
          out.push line
        else
          console.log "Invalid directory '#{userPath}'"
  console.log "Valid: #{out.length} Invalid: #{lines.length-out.length}"
  return out.join '\n'

keyFile = '/node/git/.ssh/authorized_keys'
newFile = filter keyFile
fs.writeFileSync keyFile, newFile
