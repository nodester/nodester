var request = require('request'),
    config = require('./config');

module.exports = {
    get: function(req, res, next) {
        request({ method: 'GET', uri: config.couch_loc + 'apps/_design/nodeapps/_view/all', headers: config.couch_headers }, function (err, response, body) {
            var docs;
            try {
                docs = JSON.parse(body);
            } catch (e) { } //Catch bad JSON
            var hostedapps = 0;
            var countrunning = 0;
            if (docs) { // Maybe better error handling here
                var i;
                for (i=0; i<docs.rows.length; i++) {
                    if (docs.rows[i].value.running == "true"){
                        countrunning++;
                    }
                }
                hostedapps = docs.rows.length.toString();
            }
            countrunning = countrunning.toString();
            var s = {
                status: "up",
                appshosted: hostedapps,
                appsrunning: countrunning
            };
            res.send(s);
        });
    }
}
