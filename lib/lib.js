var cradle = require('cradle');
var crypto = require('crypto');
var config = require("../config");
var fs = require('fs');

var couch_loc = "http://" + config.opt.couch_user + ":" + config.opt.couch_pass + "@" + config.opt.couch_host + ":" + config.opt.couch_port + "/";
if (config.opt.couch_prefix.length > 0) {
  couch_loc += config.opt.couch_prefix + "_";
  exports.couch_prefix = config.opt.couch_prefix + "_";
} else {
  exports.couch_prefix = "";
}
exports.couch_loc = couch_loc;
exports.h = {accept: 'application/json', 'content-type': 'application/json'};

var couchdb_parse = function (err, body, cb) {
  if (err != null) {
    cb(err, null);
  } else {
    try {
        var doc = JSON.parse(body);
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
  return new cradle.Connection({
    host: config.opt.couch_host,
    port: config.opt.couch_port,
    auth: {username: config.opt.couch_user, password: config.opt.couch_pass},
    options: {cache: true, raw: false}
  });
};
exports.get_couchdb_connection = get_couchdb_connection;

var get_couchdb_database = function (database) {
  var conn = get_couchdb_connection();
  return conn.database(exports.couch_prefix + database);
};
exports.get_couchdb_database = get_couchdb_database;

var www_dom = "www." + config.opt.tl_dom;
var tl_dom = config.opt.tl_dom;
var api_dom = config.opt.api_dom;
var default_routes = {router: {}};
default_routes.router["127.0.0.1"] = "127.0.0.1:4001";
default_routes.router[www_dom] = "127.0.0.1:4001";
default_routes.router[tl_dom] = "127.0.0.1:4001";
default_routes.router[api_dom] = "127.0.0.1:4001";
exports.default_routes = default_routes;

var build_proxytable_map = function (cb) {
  var conn = get_couchdb_connection();
  var apps = conn.database(exports.couch_prefix + "apps");
  var aliasdomains = conn.database(exports.couch_prefix + "aliasdomains");
  var proxy_map = default_routes;
  apps.view('nodeapps/all', function (err, resp) {
	if (err) {
		
	} else {
	    resp.forEach(function (row) {
	      proxy_map.router[row._id + "." + config.opt.tl_dom] = "127.0.0.1:" + row.port;
	    });
	    aliasdomains.view('aliasdomains/all', function (err, resp) {
          if (resp && resp.length) {
              resp.forEach(function (row) {
                proxy_map.router[row._id] = row.host + ":" + row.port;
              });
          }
	      cb(proxy_map);
	    });
	}
  });
};
exports.build_proxytable_map = build_proxytable_map;

var update_proxytable_map = function (cb) {
  var fs = require('fs');
  build_proxytable_map(function (proxy_map) {
    fs.writeFile(config.opt.proxy_table_file, JSON.stringify(proxy_map), function (err) {
      if (err) {
        cb(err);
      } else {
        fs.chmod(config.opt.proxy_table_file, 0666, function (err) {
          if (err) {
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

function checkDomain(nname) {
  var arr = new Array(
    '.com','.net','.org','.biz','.coop','.info','.museum','.name',
    '.pro','.edu','.gov','.int','.mil','.ac','.ad','.ae','.af','.ag',
    '.ai','.al','.am','.an','.ao','.aq','.ar','.as','.at','.au','.aw',
    '.az','.ba','.bb','.bd','.be','.bf','.bg','.bh','.bi','.bj','.bm',
    '.bn','.bo','.br','.bs','.bt','.bv','.bw','.by','.bz','.ca','.cc',
    '.cd','.cf','.cg','.ch','.ci','.ck','.cl','.cm','.cn','.co','.cr',
    '.cu','.cv','.cx','.cy','.cz','.de','.dj','.dk','.dm','.do','.dz',
    '.ec','.ee','.eg','.eh','.er','.es','.et','.fi','.fj','.fk','.fm',
    '.fo','.fr','.ga','.gd','.ge','.gf','.gg','.gh','.gi','.gl','.gm',
    '.gn','.gp','.gq','.gr','.gs','.gt','.gu','.gv','.gy','.hk','.hm',
    '.hn','.hr','.ht','.hu','.id','.ie','.il','.im','.in','.io','.iq',
    '.ir','.is','.it','.je','.jm','.jo','.jp','.ke','.kg','.kh','.ki',
    '.km','.kn','.kp','.kr','.kw','.ky','.kz','.la','.lb','.lc','.li',
    '.lk','.lr','.ls','.lt','.lu','.lv','.ly','.ma','.mc','.md','.mg',
    '.mh','.mk','.ml','.mm','.mn','.mo','.mp','.mq','.mr','.ms','.mt',
    '.mu','.mv','.mw','.mx','.my','.mz','.na','.nc','.ne','.nf','.ng',
    '.ni','.nl','.no','.np','.nr','.nu','.nz','.om','.pa','.pe','.pf',
    '.pg','.ph','.pk','.pl','.pm','.pn','.pr','.ps','.pt','.pw','.py',
    '.qa','.re','.ro','.rw','.ru','.sa','.sb','.sc','.sd','.se','.sg',
    '.sh','.si','.sj','.sk','.sl','.sm','.sn','.so','.sr','.st','.sv',
    '.sy','.sz','.tc','.td','.tf','.tg','.th','.tj','.tk','.tm','.tn',
    '.to','.tp','.tr','.tt','.tv','.tw','.tz','.ua','.ug','.uk','.um',
    '.us','.uy','.uz','.va','.vc','.ve','.vg','.vi','.vn','.vu','.ws',
    '.wf','.ye','.yt','.yu','.za','.zm','.zw','.me'
  );

  var mai = nname;
  var val = true;

  var dot = mai.lastIndexOf(".");
  var dname = mai.substring(0,dot);
  var ext = mai.substring(dot,mai.length);

  if(dot > 2 && dot < 57) {
    for(var i = 0; i < arr.length; i++) {
      if(ext == arr[i]) {
        val = true;
        break;
      } else {
        val = false;
      }
    }
    if(val == false) {
       return "Invalid domain extesion " + ext + ", please tell support to add it to allowed extensions.";
    } else {
      for(var j = 0; j < dname.length; j++) {
        var dh = dname.charAt(j);
        var hh = dh.charCodeAt(0);
        if((hh > 47 && hh < 59) || (hh > 64 && hh < 91) || (hh > 96 && hh < 123) || hh == 45 || hh == 46) {
          if((j == 0 || j == dname.length - 1) && hh == 45) {
            return "Domain names should not start or end with a '-'.";
          }
        } else  {
          return "Your domain name should not have special characters";
        }
      }
    }
  } else {
    return "Your domain name is too short/long.";
  }
  return true;
}
exports.checkDomain = checkDomain;

var escape_packages = function (str) {
  return str.replace(/[^a-zA-Z0-9 \.\-_=<>@]+/g,'');
};
exports.escape_packages = escape_packages;
var md5 = function (str) {
  return crypto.createHash('md5').update(str).digest('hex');
};
exports.md5 = md5;

var key_is_valid = function(key) {
  if (key) {
    // key format is invalid
    pieces = key.split(' ');
    if (pieces.length<2 || pieces.length>3)
      return false

    // content is invalid
    key_type = pieces[0]
    ac_key = new Buffer(pieces[1],'base64');
    if (key_type !== (ac_key.slice(4,4+7).toString()))
      return false;
    return true
  }
  else
    return false
};

exports.key_is_valid = key_is_valid;

var update_auth_keys = function(auth_keys,rsakey,user) {
  stream = fs.createWriteStream(auth_keys, {
      'flags': 'a+',
      'encoding': 'utf8',
      'mode': 0644
  });
  stream.write('command="/usr/local/bin/git-shell-enforce-directory ' + config.opt.home_dir + '/' + config.opt.hosted_apps_subdir + '/' + user._id + '",no-port-forwarding,no-X11-forwarding,no-agent-forwarding,no-pty ' + rsakey + '\n', 'utf8');
  stream.end();
};

exports.update_auth_keys = update_auth_keys;
