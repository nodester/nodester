#!/usr/bin/env node

var nodeControl = require(__dirname+'/../deps/node-control/index.js');

var util = require('util');
var ins = util.inspect;

var args = process.argv;
args.shift();
var file = args.shift();
if (args.length !== 16) {
  console.error('Invalid usage!');
  console.log('%s <top level domain> <sudo user> ' +
              '<CouchDB username> <CouchDB password> <CouchDB host> <CouchDB Port> <CouchDB prefix> ' +
              '<main host> <main username> <main home dir> ' +
              '<git host> <git username> <git home dir> '+
              '<apps host> <apps username> <apps home dir> ', file);
  console.log('nb. You should be able to ssh to the host using a key, and use sudo with no passphrase.');
  process.exit(-1);
}

var repo = "/var/nodester/nodester"; //"http://github.com/netroy/nodester.git";
var deps = ['pool', 'express', 'npm-wrapper', 'request', 'daemon', 'forever', 'cradle', 'coloured'];

var top_level_domain = args.shift();
var sudo_user = args.shift();

var couch_db_user = args.shift();
var couch_db_pass = args.shift();
var couch_db_host = args.shift();
var couch_db_port = args.shift();
var couch_db_prefix = args.shift();

var main_host = args.shift();
var main_user = args.shift();
var main_homedir = args.shift();

var git_host = args.shift();
var git_user = args.shift();
var git_homedir = args.shift();

var apps_host = args.shift();
var apps_user = args.shift();
var apps_homedir = args.shift();



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

var restart_key = random_string(13);
console.log('restart key set to: %s', restart_key);

var coupon_code = random_string(8);
console.log('coupon_code set to: %s', coupon_code);

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


/*
 * Setting up the Git server
**/
var git_list = nodeControl.hosts({
  user: sudo_user
}, [git_host])[0];
add_c(git_list, 'sudo groupadd -g 2002 ' + git_user, '', true);
add_c(git_list, 'sudo useradd -d ' + git_homedir + ' -c "nodester git user" -g ' + git_user + ' -m -r -s /bin/bash ' + git_user, '', true);
add_c(git_list, 'sudo mkdir -p ' + git_homedir + '/.ssh', '', true);
add_c(git_list, 'sudo chown -R ' + git_user + ':' + git_user + ' ' + git_homedir, '', true);
add_c(git_list, 'sudo chmod -R 0700 ' + git_homedir + '/.ssh', '', false);


/*
 * Setting up the Application servers
**/
var apps_list = nodeControl.hosts({
  user: sudo_user
}, [apps_host])[0];
add_c(apps_list, 'sudo groupadd -g 2003 ' + apps_user, '', true);
add_c(apps_list, 'sudo useradd -d ' + apps_homedir + ' -c "hosted apps" -g ' + apps_user + ' -m -r -s /bin/bash ' + apps_user, '', true);
add_c(apps_list, 'sudo mkdir -p ' + apps_homedir + '/.ssh', '', true);
add_c(apps_list, 'sudo chown -R ' + apps_user + ':' + git_user + ' ' + apps_homedir, '', true);
add_c(apps_list, 'sudo chmod -R 0774 ' + apps_homedir, '', true);


/*
 * Setting up the Main server
**/
var main_list = nodeControl.hosts({
  user: sudo_user
}, [main_host])[0];
var nodester_dir = main_homedir + '/nodester';
add_c(main_list, 'sudo groupadd -g 2001 ' + main_user, '', true);
add_c(main_list, 'sudo useradd -d ' + main_homedir + ' -c "nodester app" -g ' + main_user + ' -m -r -s /bin/bash ' + main_user, '', true);
add_c(main_list, 'sudo mkdir -p ' + main_homedir + '/.ssh', '', true);
add_c(main_list, 'sudo chmod -R 0700 ' + main_homedir + '/.ssh', '', false);
add_c(main_list, 'sudo -u ' + main_user + ' git clone ' + repo + ' ' + nodester_dir, '', true);
//add_c(main_list, 'sudo -u ' + main_user + ' cd ' + nodester_dir + ' && git submodule init && git submodule update', '', true);
add_c(main_list, 'sudo chown -R ' + main_user + ':' + main_user + ' ' + main_homedir, '', true);

/*
 * Generate the config file
**/
var conf = nodester_dir + "/config.js";
var tmp = "/tmp/config.tmp";
add_c(main_list, 'cp ' + nodester_dir + '/example_config.js ' + tmp, '', true);
add_c(main_list, 'sed -i -e "s/<TLD>/'  +  top_level_domain  +  '/g" ' + tmp, '', false);
add_c(main_list, 'sed -i -e "s/<CouchUser>/'   + couch_db_user + '/" ' + tmp, '', false);
add_c(main_list, 'sed -i -e "s/<CouchPass>/'   + couch_db_pass + '/" ' + tmp, '', false);
add_c(main_list, 'sed -i -e "s/<CouchHost>/'   + couch_db_host + '/" ' + tmp, '', false);
add_c(main_list, 'sed -i -e "s/<CouchPort>/'   + couch_db_port + '/" ' + tmp, '', false);
add_c(main_list, 'sed -i -e "s/<CouchPrefix>/' + couch_db_prefix+'/" ' + tmp, '', false);

add_c(main_list, 'sed -i -e "s/<MainHost>/'    + main_host + '/" ' + tmp, '', false);
add_c(main_list, 'sed -i -e "s/<MainUser>/'    + main_user + '/" ' + tmp, '', false);
add_c(main_list, 'sed -i -e "s/<MainHomeDir>/' + main_homedir.replace(/\//g, '\\\/') + '/g" ' + tmp, '', false);

add_c(main_list, 'sed -i -e "s/<GitHost>/'    + git_host + '/" ' + tmp, '', false);
add_c(main_list, 'sed -i -e "s/<GitUser>/'    + git_user + '/" ' + tmp, '', false);
add_c(main_list, 'sed -i -e "s/<GitHomeDir>/' + git_homedir.replace(/\//g, '\\\/') + '/" ' + tmp, '', false);

add_c(main_list, 'sed -i -e "s/<AppsHost>/'    + apps_host + '/" ' + tmp, '', false);
add_c(main_list, 'sed -i -e "s/<AppsUser>/'    + apps_user + '/" ' + tmp, '', false);
add_c(main_list, 'sed -i -e "s/<AppsHomeDir>/' + apps_homedir.replace(/\//g, '\\\/') + '/" ' + tmp, '', false);

add_c(main_list, 'sed -i -e "s/<RestartKey>/' + restart_key + '/" ' + tmp, '', false);
add_c(main_list, 'sed -i -e "s/<CouponCode>/' + coupon_code + '/" ' + tmp, '', false);
add_c(main_list, 'sudo -u ' + main_user + ' cp ' + tmp + ' ' + conf, '', false);

var repoclone = nodester_dir + '/scripts/gitrepoclone.sh';
add_c(main_list, 'cp ' + nodester_dir + '/scripts/example_gitrepoclone.sh /tmp/repoclone', '', true);
add_c(main_list, 'sed -i -e "s/<RestartKey>/'  + restart_key + '/" /tmp/repoclone', '', false);
add_c(main_list, 'sed -i -e "s/<GitHomeDir>/'  + git_homedir.replace(/\//g, '\\\/') + '/" /tmp/repoclone', '', false);
add_c(main_list, 'sed -i -e "s/<AppsHomeDir>/' + apps_homedir.replace(/\//g, '\\\/') + '/" /tmp/repoclone', '', false);
add_c(main_list, 'sudo -u ' + main_user + ' cp /tmp/repoclone ' + repoclone, '', false);

//add_c(main_list, 'sudo chown -R root:' + apps_user + ' ' + main_homedir + '/nodester/proxy', '', false);
//add_c(main_list, 'sudo mkdir -p /usr/local/bin ' + main_homedir + '/nodester/var', '', true);
add_c(main_list, 'sudo cp -f ' + nodester_dir + '/scripts/git-shell-enforce-directory /usr/local/bin/', '', false);
add_c(main_list, 'sudo chmod +x /usr/local/bin/git-shell-enforce-directory', '', true);

/*
 * Install dependencies for nodester
 * TODO: make these global & pull them out of this script
**/
add_c(main_list, 'sudo npm -g install ' + deps.join(' '), '', true);

/*
 * Setup the DB tables
**/
add_c(main_list, nodester_dir + '/scripts/couchdb/create_all_couchdb_tables.js', '', true);
add_c(main_list, nodester_dir + '/scripts/couchdb/setup_default_views.js', '', true);

/*
 * Add sudoer exceptions for the user to control proxy & main apps
**/
add_c(main_list, 'sudo cp /etc/sudoers /tmp/my_file_1', '', false);
add_c(main_list, 'sudo chown ' + sudo_user  + ' /tmp/my_file_1', '', false);
add_c(main_list, 'sudo chmod +w /tmp/my_file_1', '', false);
add_c(main_list, 'echo "' + main_user + ' ALL = NOPASSWD: ' + nodester_dir + '/bin/proxy_stop.sh" >> /tmp/my_file_1', '', false);
add_c(main_list, 'echo "' + main_user + ' ALL = NOPASSWD: ' + nodester_dir + '/bin/proxy_start.sh" >> /tmp/my_file_1', '', false);
add_c(main_list, 'echo "' + main_user + ' ALL = NOPASSWD: ' + nodester_dir + '/bin/app_stop.sh" >> /tmp/my_file_1', '', false);
add_c(main_list, 'echo "' + main_user + ' ALL = NOPASSWD: ' + nodester_dir + '/bin/app_start.sh" >> /tmp/my_file_1', '', false);
add_c(main_list, 'echo "' + main_user + ' ALL = NOPASSWD: ' + nodester_dir + '/scripts/launch_chrooted_app.js *" >> /tmp/my_file_1', '', false);
add_c(main_list, 'echo "' + main_user + ' ALL = NOPASSWD: ' + nodester_dir + '/scripts/update_authkeys.js *" >> /tmp/my_file_1', '', false);
add_c(main_list, 'echo "' + main_user + ' ALL = NOPASSWD: ' + nodester_dir + '/scripts/create_user_dir.js *" >> /tmp/my_file_1', '', false);
add_c(main_list, 'echo "' + main_user + ' ALL = NOPASSWD: ' + nodester_dir + '/scripts/gitreposetup.sh *" >> /tmp/my_file_1', '', false);
add_c(main_list, 'sudo cp /tmp/my_file_1 /etc/sudoers', '', false);
add_c(main_list, 'rm -f /tmp/my_file_1', '', false);
add_c(main_list, 'sudo chown root:root /etc/sudoers', '', false);
add_c(main_list, 'sudo chmod 0440 /etc/sudoers', '', false);

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
