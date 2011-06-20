/*global require, exports, process */

var sys = require('sys');

var tasks = {},
    descriptions = {};

// unshifted: arguments object from another function
// arguments object does not implement Array methods so this function provides a
// logical arguments.shift()
function shift(unshifted) {
    var i, length, shifted = [];
    for (i = 1, length = unshifted.length; i < length; i += 1) {
        shifted[i - 1] = unshifted[i]; 
    }
    return shifted;
}

function perform(name, config) {
    if (!name) {
        throw new Error('No task name');
    }

    var task = tasks[name],
        log = " Performing " + name;

    if (config && config.id) {
        log += " for " + config.id;
    }

    // sys.puts(log);

    if (!task) {
        throw new Error('No task named: ' + name);
    }

    return task.apply(null, shift(arguments));
}

function performAll(configs) {
    if (!configs || !(configs instanceof Array) || configs.length < 1) {
        throw new Error('No array of config objects');
    }

    var i, length, config,
        args = shift(arguments), 
        argsWithConfig;

    for (i = 0, length = configs.length; i < length; i += 1) {
        config = configs[i];

        // Copy the arguments array for each config and insert the
        // config object as the first argument to the perform function
        // to use when calling the task.
        argsWithConfig = args.slice(0);
        argsWithConfig.splice(1, 0, config);

        perform.apply(null, argsWithConfig);
    }
}

function task(name, description, callback) {
    tasks[name] = callback;
    descriptions[name] = description;
}

function list() {
    for (var i in tasks) {
        if (tasks.hasOwnProperty(i)) {
            sys.puts(i + ':  ' + descriptions[i]);
        }
    }
}

function begin() {
    var configTask = process.argv[2],
        taskWithArgs = process.argv.slice(3),
        configs = perform(configTask, taskWithArgs);
    if (taskWithArgs.length > 0) {
        taskWithArgs.unshift(configs);
        performAll.apply(null, taskWithArgs);
    }
}

task('list', 'List tasks', function () {
    list();
});

exports.task = task;
exports.begin = begin;
exports.perform = perform;
