#!/usr/bin/env node

var path = require('path');
var fs = require('fs');
var config = require('../config').opt;
var hosted = path.join(config.home_dir, config.hosted_apps_subdir);
var exists = path.existsSync;
var util = require('util');
process.chdir(hosted);
require('colors');
util.print('Reading git repos:'.magenta);
var src = path.join(config.app_dir, 'scripts', 'gitrepoclone.sh');
var copy = function() {
    if (repos.length) {
        var dest = repos.pop();
        var is = fs.createReadStream(src);
        var os = fs.createWriteStream(dest);
        util.pump(is, os, copy);
    } else {
       util.print(' [done]\n'.white);   
    }
};

var repos = []; 
var dirs = fs.readdirSync('.');
dirs.forEach(function(v) {
    if (exists(v)) {
    var stat = fs.statSync(v);
        if (stat.isDirectory()) {
            var dirs = fs.readdirSync(v);
            dirs.forEach(function(i) {
            if (path.extname(i) === '.git') {
                repos.push(path.join(hosted, v, i, 'hooks', 'post-receive'));
            }   
            });
        }
    } 
});
util.print((' (' + repos.length + ')').yellow + ' [done]\n'.white);
util.print('Processing git commit hooks'.magenta);
copy();

