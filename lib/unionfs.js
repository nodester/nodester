(function () {
  var lib = require('./lib.js');
  
  var unionfs = function (path_base, path_app, path_rw) {
    this._setup(path_base, path_app, path_rw);
  };
  unionfs.prototype._setup = function (path_base, path_app, path_rw, target_path) {
    this.mounted = false;
    this.errors = new Array();
    this.tmp_base = path.join('/', 'tmp', 'union_base_' + lib.rand_string(6));
    this.tmp_base_os = path.join(this.tmp_base, 'os');
    this.tmp_base_app = path.join(this.tmp_base, 'app');
    this.tmp_base_app_app = path.join(this.tmp_base, 'app', 'app');
    this.tmp_base_rw = path.join(this.tmp_base, 'rw');
    this.target_path = target_path;
    fs.mkdirSync(this.tmp_base, '0777');
    fs.mkdirSync(this.tmp_base_os, '0777');
    fs.mkdirSync(this.tmp_base_app, '0777');
    fs.mkdirSync(this.tmp_base_app_app, '0777');
    fs.mkdirSync(this.tmp_base_rw, '0777');
    var unionfs_opts = 'cow,default_permissions,allow_other,use_ino,suid,chroot=' + this.tmp_base; 
    tmpa = [
      'mount -o ro --bind ' + path_base + ' ' + this.tmp_base_os,
      'mount -o ro --bind ' + path_app + ' ' + this.tmp_base_app_app,
      'mount -o rw --bind ' + path_rw + ' ' + this.tmp_base_rw,
      'unionfs -o ' + unionfs_opts + ' /rw=RW:/app=RO:/os=RO ' + this.target_path
    ];
    lib.exec_array(tmpa, function () {
      lib.is_mounted(this.tmp_base_rw, function (resp) {
        if (resp != true) {
          this.errors.push(this.tmp_base_rw + ' is not mounted');
        } else {
          lib.is_mounted(this.tmp_base_app_app, function (respb) {
            if (respb != true) {
              this.errors.push(this.tmp_base_app_app + ' is not mounted');
            } else {
              lib.is_mounted(this.tmp_base_os, function (respb) {
                if (respb != true) {
                  this.errors.push(this.tmp_base_os + ' is not mounted');
                } else {
                  lib.is_mounted(this.target_path, function (respb) {
                    if (respb != true) {
                      this.errors.push(this.target_path + ' is not mounted');
                    } else {
                      this.mounted = true;
                    }
                  }.bind(this));
                }
              }.bind(this));
            }
          }.bind(this));
        }
      }.bind(this));
    }.bind(this));
  };
  unionfs.prototype._stop = function (cb) {
    if (this.mounted == true) {
      var arr = [
        'umount ' + this.target_path,
        'umount ' + this.tmp_base_rw,
        'umount ' + this.tmp_base_app_app,
        'umount ' + this.tmp_base_os,
        'rm -Rf ' + this.tmp_base
      ];
      lib.exec_array(tmpa, function () {
        lib.is_mounted(this.target_path, function (respA) {
          if (respA != false) {
            this.errors.push(this.target_path + ' is still mounted');
            cb(this.errors, undefined);
          } else {
            lib.is_mounted(this.tmp_base_rw, function (respB) {
              if (respB != false) {
                this.errors.push(this.tmp_base_rw + ' is still mounted');
                cb(this.errors, undefined);
              } else {
                lib.is_mounted(this.tmp_base_app_app, function (respB) {
                  if (respB != false) {
                    this.errors.push(this.tmp_base_app_app + ' is still mounted');
                    cb(this.errors, undefined);
                  } else {
                    lib.is_mounted(this.tmp_base_os, function (respB) {
                      if (respB != false) {
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
})()