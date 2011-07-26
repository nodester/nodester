#!/usr/bin/env node

process.chdir(__dirname);

var config = require('../config').opt;
var fs = require('fs');

var data = [];

for (var i in config) {
  if (typeof config[i] == 'string') {
    data.push('export ' + i.toUpperCase() + '=' + config[i]);
  }
}

fs.writeFileSync('./.nodester.config', data.join('\n'), encoding = 'utf8');
fs.chmodSync('./.nodester.config', '0777');