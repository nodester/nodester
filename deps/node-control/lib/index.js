/*global require, exports */

var task = require('./task'),
    host = require('./host');

exports.task = task.task;
exports.begin = task.begin; 
exports.perform = task.perform;
exports.hosts = host.hosts;
