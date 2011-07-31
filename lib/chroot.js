(function() {
  var lib = require('./lib.js');
  var path = require('path');
  var fs = require('fs');

  var chroot = function(target) {
    this._setup(target);
  };

  chroot.prototype._setup = function(target_path) {
    this.errors = [];
    this.target_path = target_path;
    this.mounted = false;
    this.proc_path = path.join(this.target_path, 'proc');
    this.dev_path = path.join(this.target_path, 'dev');
  };
  chroot.prototype.start = function(cb) {
    if (!path.existsSync(this.proc_path)) fs.mkdirSync(this.proc_path, '0777');
    if (!path.existsSync(this.dev_path)) fs.mkdirSync(this.dev_path, '0777');
    lib.ensure_mounted('/dev', this.dev_path, '--bind', function(respA) {
      if (respA === true) {
        lib.ensure_mounted('proc', this.proc_path, '-t proc', function(respB) {
          if (respB === true) {
            this.mounted = true;
            cb(undefined, true);
          } else {
            this.errors.push(this.proc_path + ' is not mounted');
            cb(this.errors, undefined);
          }
        }.bind(this));
      } else {
        this.errors.push(this.dev_path + ' is not mounted');
        cb(this.errors, undefined);
      }
    }.bind(this));
  };
  chroot.prototype.stop = function(cb) {
    if (this.mounted === true) {
      var arr = ['sudo umount ' + this.dev_path, 'sudo umount ' + this.proc_path];
      lib.exec_array(arr, function() {
        lib.is_mounted(this.dev_path, function(respA) {
          if (respA !== false) {
            this.errors.push(this.dev_path + ' is still mounted');
            cb(this.errors, undefined);
          } else {
            lib.is_mounted(this.proc_path, function(respB) {
              if (respB !== false) {
                this.errors.push(this.proc_path + ' is still mounted');
                cb(this.errors, undefined);
              } else {
                this.mounted = false;
                cb(undefined, true);
              }
            }.bind(this));
          }
        }.bind(this));
      }.bind(this));
    } else {
      cb('not_mounted', undefined);
    }
  };
  exports.chroot = chroot;
})();