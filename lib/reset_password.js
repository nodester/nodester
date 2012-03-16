var config = require('../config'),
    lib = require('./lib');

function loadAccount(user, cb) {
  var nodefu = lib.get_couchdb_database('nodefu');

  nodefu.get(user, function(err, res) {
    if (err) {
       cb(null);
    } else {
       cb(res);
    }
  });
};

function writeResponse(response, status, message) {
  response.writeHead(status, {'Content-Type':'application/json'})
  response.end(JSON.stringify(message))
}

function send500(res, err) {
  writeResponse(res, 500, {status: "failure", message: err.error + ' - ' + err.reason + '\n'})
}

module.exports = {
  post: function(req, res, next) {
    var user = req.body.user;

    loadAccount(user, function(account) {
      if (account != null) {

        lib.get_couchdb_connection().uuids(1, function(err, doc) {

          var resets = lib.get_couchdb_database('password_resets')
          resets.save(account.email, {email_sent:false, token:doc[0], user:account._id}, function(err, resp) {
            if (err) {
              send500(res, err);
            } else {
              writeResponse(res, 201,{status: "Reset password token sent to " + account.email});
            }
          })
        })
      } else {
        writeResponse(res, 400,{status: "Failure", message:"Invalid user provided"});
      }
    })
  } ,
  put: function(req, res, next) {
    var token    = req.params.token,
        password = req.body.password;
        resets   = lib.get_couchdb_database('password_resets');
    resets.view('tokens/all',{keys:[token]}, function(err, doc) {
      if (doc && doc.length==1 && doc[0].value.token === token) {
        var account = doc[0].value,
            nodefu = lib.get_couchdb_database('nodefu');
        nodefu.merge(account.user, {password: lib.md5(password)}, function(err, resp) {
          if (resp) {
            resets.remove(account._id,account._rev );
            writeResponse(res, 200, {status:"success", message:"Your password has been updated."});
          } else {
            send500(res, err);
          }
        })
      } else {
        writeResponse(res, 404, {status:"failure", messages:"No such token"});
      }
    });
  }
};
