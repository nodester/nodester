/*global require, exports, spawn: true */

var spawn = require('child_process').spawn,
    path = require('path'),
    Log = require('./log').Log;

function logBuffer(log, prefix, buffer) {
    var message = buffer.toString();
    log.puts(message, prefix);
}

function listen(subProcess, log, callback, expect, prefix) {
    var do_expect = (typeof expect != 'undefined') ? true : false;
    if (typeof prefix == 'undefined') prefix = '';
    else prefix += ' ';
    var codes = '';
    var buff = '';
    var stdout = '';
    var stderr = '';
    subProcess.stdout.addListener('data', function (data) {
        if (do_expect) buff += data.toString();
        stdout += data.toString();
        logBuffer(log, 'stdout: ', data);
    });

    subProcess.stderr.addListener('data', function (data) {
        if (do_expect) buff += data.toString();
        stderr += data.toString();
        logBuffer(log, 'stderr: ', data);
    });

    subProcess.addListener('exit', function (code) {
        if (do_expect && buff.substr(0, buff.length - 1) != expect) {
          console.error(prefix + 'Error: Unexpected result: ' + buff.substr(0, buff.length - 1) + ' != ' + expect);
        }
        logBuffer(log, 'exit: ', code);
        if (code === 0) code = undefined;
        else console.error(prefix + 'Error: Exit: ' + code.toString());
        if (callback) callback(code, stdout, stderr);
    });
}

function star(mask) {
    var stars = '',
        i, length;
    for (i = 0, length = mask.length; i < length; i += 1)  {
        stars += '*';
    }
    return stars;
}

function ssh(command, expect, callback) {
    if (!command) { 
        throw new Error(this.address + ': No command to run');
    }

    var log = this.logger,
        user = this.user,
        options = this.sshOptions,
        mask = this.logMask, stars, 
        args = ['-l' + user, this.address, "''" + command + "''"],
        subProcess;

    if (options) {
        args = options.concat(args);
    }

    if (mask) {
        stars = star(mask);
        while (command.indexOf(mask) !== -1) {
            command = command.replace(mask, stars);
        }
    }

    log.puts(user + ':ssh ' + command);
    subProcess = spawn('ssh', args); 
    listen(subProcess, log, callback, expect, this.user + '@' + this.address + ':ssh ' + command);
}

function scp(local, remote, callback, exitCallback) {
    if (!local) { 
        throw new Error(this.address + ': No local file path');
    }

    if (!remote) { 
        throw new Error(this.address + ': No remote file path');
    }

    var log = this.logger,
        user = this.user,
        options = this.scpOptions,
        address = this.address;
    path.exists(local, function (exists) {
        if (exists) {
            var reference = user + '@' + address + ':' + remote,
                args = ['-r', local, reference],
                subProcess;

            if (options) {
                args = options.concat(args);
            }

            log.puts(user + ':scp: ' + local + ' ' + reference);
            subProcess = spawn('scp', args);
            listen(subProcess, log, callback, exitCallback);
        } else {
            throw new Error('Local: ' + local + ' does not exist');
        }
    });
}

function log(message) {
    this.logger.puts(' ' + message);
}

var defaultLogPath = 'hosts.log';

function hostConstructor(config) {

    // Initialize ssh and scp options to an array if not specified so later
    // logic can assume an array exists when adding or removing options. 
    config.sshOptions = config.sshOptions || [];
    config.scpOptions = config.scpOptions || [];

    // This function may get called with different config objects
    // during a single config task (see roles example in README). Therefore
    // we cannot define the constructor as a function declaration at module
    // scope and modify its prototype because the last config would become
    // the config for all hosts.
    function Host(address) {
        var logPath = config.log || defaultLogPath;
        var echo = config.echo || false;
        this.address = address;
        this.logger = new Log(this.address + ':', logPath, echo);
        this.log = log;
        this.ssh = ssh;
        this.scp = scp;

        // Allows task execution output to identify the host a task
        // is being executed for.
        this.id = address;

    }
    Host.prototype = config;
    return Host;
}

function hosts(config, addresses) {
    if (!config) {
        throw new Error("No config");
    }
    
    if (!addresses || !(addresses instanceof Array)) {
        throw new Error("No array of addresses");
    }

    var list = [], 
        i, length, address, host,
        Host = hostConstructor(config);
    for (i = 0, length = addresses.length; i < length; i += 1) {
        address = addresses[i];
        host = new Host(address);
        list.push(host);
    }
    return list;
}

exports.hosts = hosts;
