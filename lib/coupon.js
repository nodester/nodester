var request = require('request'),
    config = require('../config');


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
    },
    //I don't have this view, so I can't test it..
    unsent: function(req, res, next) {
        request({ uri: config.couch_loc + 'coupons/_design/coupons/_view/unsent', method:'GET', headers: config.couch_headers }, function (err, response, body) {
            try {
                var doc = JSON.parse(body);
            } catch (e) {}
            var buff = "";
            for(var i in doc.rows) {
                // sys.puts(doc.rows[i].id);
                buff += doc.rows[i].id + '\n';
            }
            res.writeHead(200, {'Content-Type': 'text/plain'});
            res.end(buff);
        });
    }
};
