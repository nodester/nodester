/*
 * Nodester :: Open Source Node.JS PaaS
 * coupon
 * @license GNU Affero
 * @latestUpdate: 30-03-2012
 */


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
          res.json({
            status: "failure",
            message: err.error + ' - ' + err.reason
          },500);
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
    coupons.view('coupons/all', function(err, resp) {
      if (err) {
        res.json({
          status: "failure",
          message: err.error + ' - ' + err.reason
        },500);
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