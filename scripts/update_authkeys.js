#!/usr/bin/env node

var fs = require('fs'),
  config = require('../config.js').opt;

var stream = fs.createWriteStream(config.git_home_dir + '/.ssh/authorized_keys', {
  'flags': 'a+',
  'encoding': 'ascii',
  'mode': '0644'
});
stream.write('command="/usr/local/bin/git-shell-enforce-directory ' + process.argv[2] + '",no-port-forwarding,no-X11-forwarding,no-agent-forwarding,no-pty ' + process.argv[3] + '\r\n', 'ascii');
stream.end();
