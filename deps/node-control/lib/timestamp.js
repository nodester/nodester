// Creates a YYYYMMDDhhmmss timestamp. Ideas on how to do this more efficiently
// are welcome.

/*global require, exports */

var sys = require('sys');

function padLeft(message, length) {
    var delta, i;
    message = message.toString();
    delta = length - message.length;
    for (i = 0; i < delta; i += 1) {
        message = '0' + message;
    }
    return message;
}

function now() {
    var d = new Date(),
        year = d.getFullYear(),
        month = d.getMonth() + 1,
        day = d.getDate(),
        minute = d.getMinutes(),
        hour = d.getHours(),
        second = d.getSeconds();

    year = padLeft(year, 4);
    month = padLeft(month, 2);
    day = padLeft(day, 2);
    hour = padLeft(hour, 2);
    minute = padLeft(minute, 2);
    second = padLeft(second, 2);
    return (year + month + day + hour + minute + second);
}

exports.now = now;
