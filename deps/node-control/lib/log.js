// Provides a grep-friendly log where every line is prefixed with
// a prefix given during construction. Output goes to file and/or
// console or nowhere. Each line of output to a file is timestamped.

/*global require, exports */

var sys = require('sys'),
    fs = require('fs');

// prefix: added to log prefix to appear on each line if message has new lines
function puts(message, prefix) {
    var filestream = this.filestream,
        logPrefix = this.prefix,
        echo = this.echo,
        timestamp = this.timestamp,
        lines, line, i, length;

    if (prefix) {
        logPrefix += prefix;
    }

    // Message may contain leading, interstitial, or trailing carriage
    // returns and new lines. Carriage returns, when outputted to the
    // console (terminal) will act as a literal carriage return, going back to
    // the beginning of the line and overwriting content laid down in a
    // previous line, which makes the console (terminal) log look corrupted.
    // The strategy here is to convert all carriage returns into new lines and
    // any group of new lines into one new line and then log each line with the
    // timestamp and prefix. If you decide that all this trimming and
    // indenting can be done more efficiently, please keep the carriage return
    // issue in mind. 
    message = message.replace(/\r/g, "\n"); // Carriage return conversion
    message = message.replace(/^\n+|\n+$/g, ""); // Start and end clean up
    message = message.replace(/\n+/g, "\n"); // Group interstitial new lines 

    lines = message.split("\n");
    for (i = 0, length = lines.length; i < length; i += 1) {
        line = lines[i];
        if (line.length > 0) { // Disregard empty lines

            if (filestream) {
                filestream.write(timestamp.now() + ':' + 
                        logPrefix + line + '\n');
            }

            if (echo) {
                sys.puts(logPrefix + line);
            }
        }
    }
}

// prefix: prefix that will be prefixed to every line of output
// path: (optional) file path of persisted log 
// echo: (optional) true to echo to console, false otherwise 
// timestamper: (optional) object that returns a timestamp from now() method
function Log(prefix, path, echo, timestamp) {
    var filestream;

    if (path) {
        filestream = fs.createWriteStream(path, { flags: 'a', mode: 0600 });
    }

    timestamp = timestamp || require('./timestamp');

    return {
        prefix: prefix,
        filestream: filestream,
        echo: echo,
        timestamp: timestamp,
        puts: puts
    };
}

exports.Log = Log;
