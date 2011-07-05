(function () {
  var lib = require('./lib.js');

  var chroot = function (target) {
    this._setup(target);
  };
  chroot.prototype._setup = function (target_path) {
    this.errors = new Array();
    this.target_path = target_path;
    this.mounted = false;
    this.proc_path = path.join(this.target_path, 'proc');
    this.dev_path = path.join(this.target_path, 'dev');
    var arr = [
      'mount --bind /dev ' + this.dev_path,
      'mount -t proc proc ' + this.proc_path
    ];
    lib.exec_array(tmpa, function () {
      lib.is_mounted(this.proc_path, function (resp) {
        if (resp != true) {
          this.errors.push(this.proc_path + ' is not mounted');
        } else {
          lib.is_mounted(this.dev_path, function (respb) {
            if (respb != true) {
              this.errors.push(this.dev_path + ' is not mounted');
            } else {
              this.mounted = true;
            }
          }.bind(this));
        }
      }.bind(this));
    }.bind(this));
  };
  chroot.prototype.stop = function (cb) {
    if (this.mounted == true) {
      var arr = [
        'umount ' + this.dev_path,
        'umount ' + this.proc_path
      ];
      lib.exec_array(tmpa, function () {
        lib.is_mounted(this.dev_path, function (respA) {
          if (respA != false) {
            this.errors.push(this.dev_path + ' is still mounted');
            cb(this.errors, undefined);
          } else {
            lib.is_mounted(this.proc_path, function (respB) {
              if (respB != false) {
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