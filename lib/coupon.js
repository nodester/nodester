var request = require('request'),
    config = require('./config');


module.exports = {
    post: function(req, res, next) {
        var email = req.body.email;
        if (typeof email != 'undefined') {
            request({ uri: config.couch_loc + "coupons", method: 'POST', body: JSON.stringify({_id: email}), headers: config.couch_headers}, function (err, response, body) {
                res.send({ status: "success - you are now in queue to receive an invite on our next batch!" });
            });
        } else {
            res.send({ status: "failure - please try again shortly!" });
        }
    }
};
