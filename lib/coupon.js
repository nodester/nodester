var lib = require('./lib'),
    config = require('../config');


module.exports = {
  post: function(req, res, next) {
    var email = req.body.email;
    if (typeof email != 'undefined') {
      var coupons = lib.get_couchdb_database('coupons');
      coupons.save(email, {
        sent: false
      }, function(err, resp) {
        if (err) {
          res.writeHead(500, {
            'Content-Type': 'application/json'
          });
          res.end(JSON.stringify({
            status: "failure",
            message: err.error + ' - ' + err.reason
          }) + '\n');
        } else {
          res.send({
            status: "success - you are now in queue to receive an invite on our next batch!"
          });
        }
      });
    } else {
      res.send({
        status: "failure - please try again shortly!"
      });
    }
  },
  //I don't have this view, so I can't test it..
  // Convert to use Cradle
  unsent: function(req, res, next) {
    var coupons = lib.get_couchdb_database('coupons');
    coupons.view('coupons/unsent', function(err, resp) {
      if (err) {
        res.writeHead(500, {
          'Content-Type': 'application/json'
        });
        res.end(JSON.stringify({
          status: "failure",
          message: err.error + ' - ' + err.reason
        }) + '\n');
      } else {
        var buff = "";
        resp.forEach(function(row) {
          buff += row._id + '\n';
        });
        res.writeHead(200, {
          'Content-Type': 'text/plain'
        });
        res.end(buff);
      }
    });
  }
};