#!/usr/bin/env node

var nodeControl = require('../deps/node-control/index.js');

var util = require('util');
var ins = util.inspect;

var args = process.argv;
args.shift();
args.shift();
if (args.length < 13) {
  console.error('Invalid usage!');
  console.log('install.js <username> <hostname> <top level domain> <couch db user> <couch db pass> <couch db ip> <couch db port> <couch db prefix> <tenant apps dir> <install app username> <app home dir> <install git username> <git home dir>');
  console.log('nb. You should be able to ssh to the host using a key, and use sudo with no passphrase.');
  process.exit(1);
}
var username = args.shift();
var hostname = args.shift();
var tl_domain = args.shift();
var couch_db_user = args.shift();
var couch_db_pass = args.shift();
var couch_db_host = args.shift();
var couch_db_port = args.shift();
var couch_db_prefix = args.shift();
var apps_homedir = args.shift();
var app_username = args.shift();
var app_homedir = args.shift();
var git_username = args.shift();
var git_homedir = args.shift();

var deps = new Array('pool', 'express', 'npm-wrapper', 'request', 'daemon', 'forever', 'cradle', 'colored');

var ssh_config_base = {
  user: username
};
var ssh_hosts_base = nodeControl.hosts(ssh_config_base, [hostname]);
var host_base = ssh_hosts_base[0]; // TODO - This is for a single host install, need to create multi host install.
var ssh_config_app = {
  user: app_username
};
var ssh_hosts_app = nodeControl.hosts(ssh_config_app, [hostname]);
var host_app = ssh_hosts_app[0];

var random_string = function(L) {
  var s = '';
  var randomchar = function() {
    var n = Math.floor(Math.random() * 62);
    if (n < 10) return n; // 1-10
    if (n < 36) return String.fromCharCode(n + 55); // A-Z
    return String.fromCharCode(n + 61); // a-z
  };
  while (s.length < L) s += randomchar();
  return s;
};


var print_lines_prefix = function(prefix, lines) {
  var i = 0,
      l = lines.length;
  for (i = 0; i < l; i++) {
    if (i < (l - 1) || lines[i].length > 0) console.log('%s: %s', prefix, lines[i]);
  }
};

var commands = [];
var add_c = function(host, cmd, exp, need) {
  commands.push([host, cmd, exp, need]);
};


add_c(host_base, 'sudo groupadd -g 2001 ' + app_username, '', true);
add_c(host_base, 'sudo groupadd -g 2002 ' + git_username, '', true);
add_c(host_base, 'sudo useradd -d ' + app_homedir + ' -c "nodester app" -g ' + app_username + ' -m -r -s /bin/bash ' + app_username, '', true);
add_c(host_base, 'sudo useradd -d ' + git_homedir + ' -c "nodester git user" -g ' + git_username + ' -m -r -s /bin/bash ' + git_username, '', true);
add_c(host_base, 'sudo mkdir ' + app_homedir + '/.ssh', '', true);
add_c(host_base, 'sudo mkdir ' + apps_homedir, '', true);
add_c(host_base, 'sudo chown -R ' + app_username + ':' + git_username + '' + apps_homedir, '', true);
add_c(host_base, 'sudo chmod -R 0774 ' + apps_homedir, '', true);
add_c(host_base, 'sudo cp ${HOME}/.ssh/authorized_keys ' + app_homedir + '/.ssh/authorized_keys', '', true);
add_c(host_base, 'sudo chown -R ' + app_username + ':' + app_username + ' ' + app_homedir + '/.ssh', '', false);
add_c(host_base, 'sudo chmod -R 0700 ' + app_homedir + '/.ssh', '', false);

add_c(host_app, 'git clone http://github.com/DanBUK/nodester.git ./nodester', '', true);
add_c(host_app, 'cp ./nodester/example_config.js ./nodester/config.js', '', true);
add_c(host_app, 'sed -i -e "s/\\\/var\\\/nodester/' + app_homedir.replace('/', '\\\/') + '/g" ./nodester/config.js', '', false);
add_c(host_app, 'sed -i -e "s/couch_user: \'nodester/couch_user: \'' + couch_db_user + '/" ./nodester/config.js', '', false);
add_c(host_app, 'sed -i -e "s/couch_pass: \'password/couch_pass: \'' + couch_db_pass + '/" ./nodester/config.js', '', false);
add_c(host_app, 'sed -i -e "s/couch_host: \'127.0.0.1/couch_host: \'' + couch_db_host + '/" ./nodester/config.js', '', false);
add_c(host_app, 'sed -i -e "s/couch_port: 5984/couch_port: ' + couch_db_port + '/" ./nodester/config.js', '', false);
add_c(host_app, 'sed -i -e "s/couch_prefix: \'nodester/couch_prefix: \'' + couch_db_prefix + '/" ./nodester/config.js', '', false);
add_c(host_app, 'sed -i -e "s/git_user: \'nodester/git_user: \'' + git_username + '/" ./nodester/config.js', '', false);
add_c(host_app, 'sed -i -e "s/userid: \'nodester/userid: \'' + app_username + '/" ./nodester/config.js', '', false);
add_c(host_app, 'sed -i -e "s/testnodester.com/' + tl_domain + '/g" ./nodester/config.js', '', false);

add_c(host_base, 'sudo chown -R root:' + app_username + ' ' + app_homedir + '/nodester/proxy', '', false);
add_c(host_base, 'sudo mkdir -p /usr/local/bin ' + app_homedir + '/nodester/var', '', true);
add_c(host_base, 'sudo cp -f ' + app_homedir + '/nodester/scripts/git-shell-enforce-directory /usr/local/bin/', '', false);
add_c(host_base, 'sudo chmod +x /usr/local/bin/git-shell-enforce-directory', '', true);

var restart_key = random_string(13);
var coupon_code = random_string(8);
console.log('coupon_code set to: %s', coupon_code);
console.log('restart key set to: %s', restart_key);

add_c(host_app, 'cp ./nodester/scripts/example_gitrepoclone.sh ./nodester/scripts/gitrepoclone.sh', '', true);
add_c(host_app, 'sed -i -e "s/KeepThisSecret/' + restart_key + '/" ./nodester/config.js', '', false);
add_c(host_app, 'sed -i -e "s/KeepThisSecret/' + restart_key + '/" ./nodester/scripts/gitrepoclone.sh', '', false);
add_c(host_app, 'sed -i -e "s/CouponCode/' + coupon_code + '/" ./nodester/config.js', '', false);
for (var i in deps) {
  add_c(host_app, 'npm install ' + deps[i], '', true);
}

add_c(host_app, './nodester/scripts/couchdb/create_all_couchdb_tables.js', '', true);
add_c(host_app, './nodester/scripts/couchdb/setup_default_views.js', '', true);

add_c(host_base, 'sudo cp /etc/sudoers /tmp/my_file_1', '', false);
add_c(host_base, 'sudo chown ' + username + ' /tmp/my_file_1', '', false);
add_c(host_base, 'echo "' + app_username + ' ALL = NOPASSWD: ' + app_homedir + '/nodester/bin/proxy_stop.sh" >> /tmp/my_file_1', '', false);
add_c(host_base, 'echo "' + app_username + ' ALL = NOPASSWD: ' + app_homedir + '/nodester/bin/proxy_start.sh" >> /tmp/my_file_1', '', false);
add_c(host_base, 'echo "' + app_username + ' ALL = NOPASSWD: ' + app_homedir + '/nodester/scripts/launch_chrooted_app.js *" >> /tmp/my_file_1', '', false);
add_c(host_base, 'echo "' + app_username + ' ALL = NOPASSWD: ' + app_homedir + '/nodester/scripts/update_authkeys.js *" >> /tmp/my_file_1', '', false);
add_c(host_base, 'echo "' + app_username + ' ALL = NOPASSWD: ' + app_homedir + '/nodester/scripts/create_user_dir.js *" >> /tmp/my_file_1', '', false);
add_c(host_base, 'echo "' + app_username + ' ALL = NOPASSWD: ' + app_homedir + '/nodester/scripts/gitreposetup.sh *" >> /tmp/my_file_1', '', false);
add_c(host_base, 'sudo cp /tmp/my_file_1 /etc/sudoers', '', false);
add_c(host_base, 'rm -f /tmp/my_file_1', '', false);
add_c(host_base, 'sudo chown root:root /etc/sudoers', '', false);
add_c(host_base, 'sudo chmod 0440 /etc/sudoers', '', false);

var run_command = function(cmds) {
  var cmd = cmds.shift();
  cmd[0].ssh(cmd[1], cmd[2], function(err, stdout, stderr) {
    if (cmd[3] === false && err > 0) {
      console.error('failed command: %s', cmd[1]);
      console.error('response expected: "%s"', cmd[2]);
      console.error('response recieved:\nSTDOUT: "%s"\nSTDERR: "%s"', stdout, stderr);
      process.exit(3);
    } else {
      console.log('completed: %s', cmd[1]);
      if (cmds.length > 0) {
        run_command(cmds);
      }
    }
  });
};

if (commands.length > 0) {
  run_command(commands);
}