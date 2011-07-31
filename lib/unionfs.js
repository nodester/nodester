(function() {
  var lib = require('./lib.js');
  var path = require('path');
  var fs = require('fs');
  var exec = require('child_process').exec;

  var unionfs = function(path_base, path_app, path_rw, target_path) {
    this._setup(path_base, path_app, path_rw, target_path);
  };
  unionfs.prototype._setup = function(path_base, path_app, path_rw, target_path) {
    this.mounted = false;
    this.errors = [];
    // this.tmp_base = path.join('/', 'tmp', 'union_base_' + lib.rand_string(6));
    this.tmp_base = path.join(path.dirname(path_app), path.basename(path_app) + '_pre_chroot');
    this.tmp_base_os = path.join(this.tmp_base, 'os');
    this.tmp_base_app = path.join(this.tmp_base, 'app');
    this.tmp_base_app_app = path.join(this.tmp_base, 'app', 'app');
    this.tmp_base_rw = path.join(this.tmp_base, 'rw');
    this.path_base = path_base;
    this.path_app = path_app;
    this.path_rw = path_rw;
    this.target_path = target_path;
  };
  unionfs.prototype.start = function(cb) {
    if (!path.existsSync(this.tmp_base)) fs.mkdirSync(this.tmp_base, '0777');
    if (!path.existsSync(this.tmp_base_os)) fs.mkdirSync(this.tmp_base_os, '0777');
    if (!path.existsSync(this.tmp_base_app)) fs.mkdirSync(this.tmp_base_app, '0777');
    if (!path.existsSync(this.tmp_base_app_app)) fs.mkdirSync(this.tmp_base_app_app, '0777');
    if (!path.existsSync(this.tmp_base_rw)) fs.mkdirSync(this.tmp_base_rw, '0777');
    if (!path.existsSync(this.target_path)) fs.mkdirSync(this.target_path, '0777');
    var unionfs_opts = 'cow,default_permissions,allow_other,use_ino,suid,chroot=' + this.tmp_base;
    lib.ensure_mounted(this.path_base, this.tmp_base_os, '-o ro --bind', function(respA) {
      if (respA === true) {
        lib.ensure_mounted(this.path_app, this.tmp_base_app_app, '-o ro --bind', function(respB) {
          if (respB === true) {
            lib.ensure_mounted(this.path_rw, this.tmp_base_rw, '-o rw --bind', function(respC) {
              if (respC === true) {
                exec('sudo unionfs -o ' + unionfs_opts + ' /rw=RW:/app=RO:/os=RO ' + this.target_path, function(err, stdout, stderr) {
                  lib.is_mounted(this.target_path, function(respd) {
                    if (respd !== true) {
                      this.errors.push(this.target_path + ' is not mounted');
                      cb(this.errors, undefined);
                    } else {
                      this.mounted = true;
                      cb(undefined, true);
                    }
                  }.bind(this));
                }.bind(this));
              } else {
                this.errors.push(this.tmp_base_rw + ' is not mounted');
                cb(this.errors, undefined);
              }
            }.bind(this));
          } else {
            this.errors.push(this.tmp_base_app_app + ' is not mounted');
            cb(this.errors, undefined);
          }
        }.bind(this));
      } else {
        this.errors.push(this.tmp_base_os + ' is not mounted');
        cb(this.errors, undefined);
      }
    }.bind(this));
  };
  unionfs.prototype.stop = function(cb) {
    if (this.mounted === true) {
      var arr = ['sudo umount ' + this.target_path, 'sudo umount ' + this.tmp_base_rw, 'sudo umount ' + this.tmp_base_app_app, 'sudo umount ' + this.tmp_base_os
      // 'rm -Rf ' + this.tmp_base
      ];
      lib.exec_array(arr, function() {
        lib.is_mounted(this.target_path, function(respA) {
          if (respA !== false) {
            this.errors.push(this.target_path + ' is still mounted');
            cb(this.errors, undefined);
          } else {
            lib.is_mounted(this.tmp_base_rw, function(respB) {
              if (respB !== false) {
                this.errors.push(this.tmp_base_rw + ' is still mounted');
                cb(this.errors, undefined);
              } else {
                lib.is_mounted(this.tmp_base_app_app, function(respB) {
                  if (respB !== false) {
                    this.errors.push(this.tmp_base_app_app + ' is still mounted');
                    cb(this.errors, undefined);
                  } else {
                    lib.is_mounted(this.tmp_base_os, function(respB) {
                      if (respB !== false) {
                        this.errors.push(this.tmp_base_os + ' is still mounted');
                        cb(this.errors, undefined);
                      } else {
                        this.mounted = false;
                        cb(undefined, true);
                      }
                    }.bind(this));
                  }
                }.bind(this));
              }
            }.bind(this));
          }
        }.bind(this));
      }.bind(this));
    } else {
      cb('not_mounted', undefined);
    }
  };
  exports.unionfs = unionfs;
})();