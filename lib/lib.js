var cradle  = require('cradle');
var crypto  = require('crypto');
var exec    = require('child_process').exec;
var config  = require('../config.js');
var chroot  = require('./chroot.js').chroot;
var unionfs = require('./unionfs.js').unionfs;
var sys     = require('sys');
var fs      = require('fs');
var path    = require('path');

var couch_loc = "http://" + config.opt.couch_user + ":" + config.opt.couch_pass + "@" + config.opt.couch_host + ":" + config.opt.couch_port + "/";
if (config.opt.couch_prefix.length > 0) {
  couch_loc += config.opt.couch_prefix + "_";
  exports.couch_prefix = config.opt.couch_prefix + "_";
} else {
  exports.couch_prefix = "";
}
exports.couch_loc = couch_loc;
exports.h = {
  accept: 'application/json',
  'content-type': 'application/json'
};

var couchdb_parse = function (err, body, cb) {
    if (err !== null) {
      cb(err, null);
    } else {
      var doc = {};
      try {
        doc = JSON.parse(body);
      } catch (e) {}

      if (doc.hasOwnProperty('error')) {
        cb(doc.error, doc);
      } else {
        cb(null, doc);
      }
    }
  };
exports.couchdb_parse = couchdb_parse;

var get_couchdb_connection = function () {
    var c_opts = {
      auth: {
        username: config.opt.couch_user,
        password: config.opt.couch_pass
      },
      cache: true,
      raw: false
    };
    var proto = 'http';
    if (config.opt.couch_port == 443) {
      c_opts['secure'] = true;
      proto = 'https';
    }

    return new(cradle.Connection)(proto + '://' + config.opt.couch_host, 5984, c_opts);
  };
exports.get_couchdb_connection = get_couchdb_connection;

var get_couchdb_database = function (database) {
    var conn = get_couchdb_connection();
    return conn.database(exports.couch_prefix + database);
  };
exports.get_couchdb_database = get_couchdb_database;

var www_dom = 'www.' + config.opt.tl_dom;
var tl_dom = config.opt.tl_dom;
var api_dom = config.opt.api_dom;
var default_routes = {
  router: {}
};
//default_routes.router[''] = 80;
//default_routes.router['127.0.0.1'] = 4001;
default_routes.router[www_dom] = 4001;
default_routes.router[tl_dom] = 4001;
default_routes.router['site.' + config.opt.tl_dom] = 13377;
default_routes.router[api_dom] = 4001;
exports.default_routes = default_routes;

var build_proxytable_map = function (cb) {
    var conn = get_couchdb_connection();
    var apps = get_couchdb_database("apps");
    var aliasdomains = get_couchdb_database("aliasdomains");
    var proxy_map = default_routes;
    apps.view('nodeapps/all', {}, function (err, resp) {
      if (err) {
        console.log('Error building ptable from db - ' + sys.inspect(err));
      } else {
        resp.forEach(function (row) {
          if (row.port && row._id) { // Block null routes
            proxy_map.router[row._id + "." + config.opt.tl_dom] = parseInt(row.port, 10);
          }
        });
        aliasdomains.view('aliasdomains/all', {}, function (err, resp) {
          if (resp && resp.length) {
            resp.forEach(function (row) {
              if (row.port && row._id && row.host) { // Block null routes
                proxy_map.router[row._id] = parseInt(row.port, 10);
                proxy_map.router[row.host] = parseInt(row.port, 10);
              }
            });
          }
          cb(proxy_map);
        });
      }
    });
  };

exports.build_proxytable_map = build_proxytable_map;

var update_proxytable_map = function (cb) {
    console.log('Update called on ptable ' + config.opt.proxy_table_file);
    build_proxytable_map(function (proxy_map) {
      fs.writeFile(config.opt.proxy_table_file, JSON.stringify(proxy_map.router), function (err) {
        if (err) {
          console.log('PTABLE WRITE ERROR: ' + err);
          cb(err);
        } else {
          fs.chmod(config.opt.proxy_table_file, '0666', function (err) {
            if (err) {
              console.log('PTABLE CHMOD ERROR: ' + err);
              cb(err);
            } else {
              cb();
            }
          });
        }
      });
    });
  };

exports.update_proxytable_map = update_proxytable_map;

var checkDomain = function (nname) {
    var arr = new Array('.com', '.net', '.org', '.biz', '.coop', '.info', '.mobi', '.museum', '.name', '.pro', '.edu', '.gov', '.int', '.mil', '.ac', '.ad', '.ae', '.af', '.ag', '.ai', '.al', '.am', '.an', '.ao', '.aq', '.ar', '.as', '.at', '.au', '.aw', '.az', '.ba', '.bb', '.bd', '.be', '.bf', '.bg', '.bh', '.bi', '.bj', '.bm', '.bn', '.bo', '.br', '.bs', '.bt', '.bv', '.bw', '.by', '.bz', '.ca', '.cc', '.cd', '.cf', '.cg', '.ch', '.ci', '.ck', '.cl', '.cm', '.cn', '.co', '.cr', '.cu', '.cv', '.cx', '.cy', '.cz', '.de', '.dj', '.dk', '.dm', '.do', '.dz', '.ec', '.ee', '.eg', '.eh', '.er', '.es', '.et', '.fi', '.fj', '.fk', '.fm', '.fo', '.fr', '.ga', '.gd', '.ge', '.gf', '.gg', '.gh', '.gi', '.gl', '.gm', '.gn', '.gp', '.gq', '.gr', '.gs', '.gt', '.gu', '.gv', '.gy', '.hk', '.hm', '.hn', '.hr', '.ht', '.hu', '.id', '.ie', '.il', '.im', '.in', '.io', '.iq', '.ir', '.is', '.it', '.je', '.jm', '.jo', '.jp', '.ke', '.kg', '.kh', '.ki', '.km', '.kn', '.kp', '.kr', '.kw', '.ky', '.kz', '.la', '.lb', '.lc', '.li', '.lk', '.lr', '.ls', '.lt', '.lu', '.lv', '.ly', '.ma', '.mc', '.md', '.mg', '.mh', '.mk', '.ml', '.mm', '.mn', '.mo', '.mp', '.mq', '.mr', '.ms', '.mt', '.mu', '.mv', '.mw', '.mx', '.my', '.mz', '.na', '.nc', '.ne', '.nf', '.ng', '.ni', '.nl', '.no', '.np', '.nr', '.nu', '.nz', '.om', '.pa', '.pe', '.pf', '.pg', '.ph', '.pk', '.pl', '.pm', '.pn', '.pr', '.ps', '.pt', '.pw', '.py', '.qa', '.re', '.ro', '.rw', '.ru', '.sa', '.sb', '.sc', '.sd', '.se', '.sg', '.sh', '.si', '.sj', '.sk', '.sl', '.sm', '.sn', '.so', '.sr', '.st', '.sv', '.sy', '.sz', '.tc', '.td', '.tf', '.tg', '.th', '.tj', '.tk', '.tm', '.tn', '.to', '.tp', '.tr', '.tt', '.tv', '.tw', '.tz', '.ua', '.ug', '.uk', '.um', '.us', '.uy', '.uz', '.va', '.vc', '.ve', '.vg', '.vi', '.vn', '.vu', '.ws', '.wf', '.ye', '.yt', '.yu', '.za', '.zm', '.zw', '.me');

    var mai = nname;
    var val = true;

    var dot = mai.lastIndexOf(".");
    var dname = mai.substring(0, dot);
    var ext = mai.substring(dot, mai.length);

    if (dot > 2 && dot < 57) {
      for (var i = 0; i < arr.length; i++) {
        if (ext == arr[i]) {
          val = true;
          break;
        } else {
          val = false;
        }
      }
      if (val === false) {
        return "Invalid domain extension " + ext + ", please tell support to add it to allowed extensions.";
      } else {
        for (var j = 0; j < dname.length; j++) {
          var dh = dname.charAt(j);
          var hh = dh.charCodeAt(0);
          if ((hh > 47 && hh < 59) || (hh > 64 && hh < 91) || (hh > 96 && hh < 123) || hh == 45 || hh == 46) {
            if ((j === 0 || j == dname.length - 1) && hh == 45) {
              return "Domain names should not start or end with a '-'.";
            }
          } else {
            return "Your domain name should not have special characters";
          }
        }
      }
    } else {
      return "Your domain name is too short/long.";
    }
    return true;
  };

exports.checkDomain = checkDomain;

var escape_packages = function (str) {
    // return str.replace(/[^a-zA-Z0-9 \.\-_=<>@]+/g, '');
	return str.replace(/[^a-zA-Z0-9 \.\-_=<>@]+/g, '').replace(/^[^a-zA-Z0-9]/, '');
  };
exports.escape_packages = escape_packages;

var md5 = function (str) {
    return crypto.createHash('md5').update(str).digest('hex');
  };

exports.md5 = md5;

var rand_string = function (n) {
    var cs = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz';
    var cslen = cs.length;
    var rtv = '';
    var rand_char = function () {
        return cs.substr(Math.floor(Math.random() * cslen), 1);
      };
    for (var i = 0; i < n; i++) {
      rtv += rand_char();
    }
    return rtv;
  };

exports.rand_string = rand_string;

var exec_array = function (arr, my_cb) {
    var running = false;
    var timer = null;
    var do_job = function () {
        running = true;
        var v = arr.shift();
        exec(v, function (err, stdout, stderr) {
          if (err) {
            console.error('lib.exec_array exit: %d - %s', err.code, err.toString());
          }
          if (stdout) {
            console.log('%s stdout: %s', v, stdout); // Ugly output atm.
          }
          if (stderr) {
            console.log('%s stderr: %s', v, stderr); // Ditto
          }
          running = false;
        });
      };
    timer = setInterval(function () {
      if (arr.length > 0) {
        if (running === false) {
          do_job();
        }
      } else {
        clearInterval(timer);
        my_cb();
      }
    }, 250);
  };

exports.exec_array = exec_array;

var is_mounted = function (pat, cb) {
    exec('mount | grep \'' + pat + '\'', function (err, stdout, stderr) {
      var pos = stdout.indexOf(pat);
      if (pos > -1) {
        cb(true);
      } else {
        cb(false);
      }
    });
  };

exports.is_mounted = is_mounted;

var ensure_mounted = function (src, tgt, opts, cb) {
    is_mounted(tgt, function (resp) {
      if (resp === true) {
        cb(true);
      } else {
        var cmd = 'sudo mount ' + opts + ' ' + src + ' ' + tgt;
        exec(cmd, function (err, stdout, stderr) {
          is_mounted(tgt, function (resp) {
            if (resp === true) {
              cb(true);
            } else {
              cb(false);
            }
          });
        });
      }
    });
  };

exports.ensure_mounted = ensure_mounted;

var tear_down_unionfs_chroot = function (chroot_base, git_home, rw_folder, final_chroot, callback) {
    var chr = new chroot(final_chroot);
    chr.mounted = true;
    chr.stop(function (err, resp) {
      // Ignore output...
      // BAD need to fix this...
      if (err) {
        console.log('tear_down_unionfs_chroot error: ' + err);
      }
      var ufs = new unionfs(chroot_base, git_home, rw_folder, final_chroot);
      ufs.mounted = true;
      ufs.stop(function (err, resp) {
        callback();
      });
    });
  };

exports.tear_down_unionfs_chroot = tear_down_unionfs_chroot;

var setup_unionfs_chroot = function (chroot_base, git_home, rw_folder, final_chroot, callback) {
    var ufs = new unionfs(chroot_base, git_home, rw_folder, final_chroot);
    ufs.start(function (err, resp) {
      if (err) {
        console.error('Error setting up unionfs mounts');
        console.error(err);
        callback(false);
      } else {
        var chr = new chroot(final_chroot);
        chr.start(function (err, resp) {
          if (err) {
            console.error('Error setting up chroot mounts');
            console.error(err);
            callback(false);
          } else {
            callback(true);
          }
        });
      }
    });
  };

  exports.setup_unionfs_chroot = setup_unionfs_chroot;

  var check_node_version = function(ver,cb){
    if (ver){
      exec('n use ' + ver, function(e,d){
        if (e){
          cb(false);
        } else {
          cb(true);
        }
      });
    } else {
      cb(false);
    }
  };

  exports.check_node_version = check_node_version;

  var check_available_versions = function(cb){
    exec('n', function(e,list){
      if (!e) {
        var installed = list.split('\n');
        list = installed.filter(function(v) {
                     return !isNaN(parseInt(v));
                   }).map(function(v){
                     return v.trim();
                   });
        // add the current version who by default is scaped
        list.push(process.version.replace('v',''));
        cb(list);
      } else {
        cb(['not_versions_found']);
      }
    });
  };

  exports.check_available_versions = check_available_versions;
  
  // I think that a Sync version of the above functions would be useful
  var node_versions = function(){
    return fs.readdirSync('/usr/local/n/versions');
  };

  exports.node_versions = node_versions;
  
var watcher_code = function(domain,user,mem,space){
  var usern = user.split(':')[0]
  var pass = user.split(':')[1]
  mem  = mem || 25;
  space = space || 25;
  return ";(new (require('node-watcher'))\
({host:'"+ domain+"',user:'"+usern + "',password:'"+ pass+"'\
,path:'/app/audit'})).emitter({maxMemory:"+mem+",sizeSpace:"+space+",\
checkSpace:true});"

}

exports.watcher_code = watcher_code;

var insert_code = function(location,file,user,domain,table,cb){
  var repo_id = location.split('/');
  repo_id = repo_id[repo_id.length-1];
  // I don't like try/catch but I'm trying to make this function sync as posibble
  // more reliable in the response method that I'm looking for
  try {
    var table = JSON.parse(fs.readFileSync(table));
  } catch(e){
    console.error(new Date,'\t',e.message,e.stack)
    var table ={}
  }
  try {
    if (path.extname(path.join(location,file)) ===  '.js'){
      var target = path.join(location,file);
        exec([
             'sudo chown -R nodester '+ location,
             'cd '+ location].join('; '),function(err,stdout,stderr){
          if (!err){
            var old =  fs.readFileSync(target, 'utf8');
            var newfile ='';
            var mem = 25, space=25
            if (table[repo_id]) {
              mem   = table[repo_id].mem || 25
              space = table[repo_id].space || 25
            }
            console.log(new Date,'\t',repo_id+ '\'ll run with mem:',mem,'and space:',space)
            var code = watcher_code(domain,user,mem,space)
            // removing previous code
            old = old.split('\n').filter(function(line){
              return !/require\(\'node\-watcher\'\)/gi.test(line);
            }).join('\n');
            var lines = old.split('\n');
            if (/\#!\//gi.test(lines[0])){
              var shebang = lines[0]
              lines.shift();
              newfile = shebang+'\n'+code+'\n'+lines.join('\n');
            } else {
              newfile = code+'\n'+old
            }
            var inserted = fs.createWriteStream(target, {'flags': 'w'},'utf8');
            inserted.end(newfile);
            if (!path.existsSync(path.join(location,'package.json'))) {
              var toWrite= '{"name":"app'+Math.round(Math.random(0,10)*30)+'","node":"0.6.12","version":"0.0.1"}';
              fs.writeFileSync(path.join(location,'package.json'), toWrite, 'utf8');
            }
            exec([
             'cd '+ location,
             'n npm 0.6.12 install node-watcher .',
             'sudo git add .',
             'sudo git commit -am "[nodesterBot] Watcher code inserted"',
             'sudo chown -R git '+location].join('; '),function(error,stdout2){
              if (error) throw error;
            });
          } else {
              throw err;
          }
        });
        return true;
    } else {
     return false;
    }
  }catch(e){
    return false;
  }
}

exports.insert_code = insert_code;