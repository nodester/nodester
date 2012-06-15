#!/usr/bin/env node

/*
 * Nodester opensource Node.js hosting service
 * Written by: @ChrisMatthieu & @DanBUK
 * Mainteiner: Alejandro Morales (@_alejandromg)
 * http://nodester.com
 * http://github.com/nodester
*/

var express = require('express')
  , url     = require('url')
  , sys     = require('util')
  , path    = require('path')
  , Logger  = require('bunyan')
  , log     = process.log = new Logger({name: "nodester"})
  , config  = require('./config')
  , middle  = require('./lib/middle')
  , stats   = require('./lib/stats')
  ;

var __app__ = express.createServer()
  , app = __app__
  ;

app.configure(function () {
  app.use(express.bodyParser());
  app.use(express.static(config.opt.public_html_dir));
  app.use(express.errorHandler({
    showStack: true,
    dumpExceptions: true
  }));
});

/*
 * status emitter
*/


// var bolt = require('bolt');

try { 

  var dash = new bolt.Node({
      delimiter : '::',
      host      : config.opt.redis.host,
      port      : config.opt.redis.port,
      user      : config.opt.redis.user,
      auth      : config.opt.redis.auth,
      silent    : true
  });

  dash.start();
} catch (e){
  var EventEmitter = require('events').EventEmitter;
  var dash = process.dash = new EventEmitter;
}

/*
 * Error handler
 */

app.error(function (err, req, res, next) {
  if (err instanceof NotFound) {
    res.sendfile(__dirname + '/public/404.html')
  } else {
    log.warn(err)
    dash.emit('nodester::500',{msg:err.message,stack:err.stack.toString()})
    res.sendfile(__dirname + '/public/500.html')
  }
});

app.all('*',function(req,res,next){
  if (!path.extname(req.url)){
    var ip = req.connection.remoteAddress || req.socket.remoteAddress;
    if (req.headers["x-real-ip"]) ip =req.headers["x-real-ip"];
    var toEmit = {
      ip     : ip,
      url    : req.url,
      time   : new Date,
      method : req.method,
      ua     : req.headers['user-agent'] || 'nodester',
      host   : req.headers.host
    }
    dash.emit('nodester::incomingRequest', toEmit)
  }
  next()
})

function getStats(){
  var statistics ={}
  for (var stat in stats){
    // ignore childprocess which can cause high latency
    if (stat != 'getDiskUsage' && stat != 'getProcesses'){
      statistics[stat]  = stats[stat]()
    }
  }
  return statistics;
}

/*
 * Ping every 3 seconds
*/
setInterval(function(){
  dash.emit('nodester::ping',{date:new Date})
},3000)

/*
 * emit stats every 5 seconds
*/

setInterval(function(){
  dash.emit('nodester::stats',getStats())
}, 5000)


process.on('uncaughtException', function (err) {
  dash.emit('nodester::uE',{ msg:err.message,stack:err.stack.toString()})
  log.fatal(err.stack)
  // Kill it with fire dude
  var slog = fs.createWriteStream(path.join(config.opt.logs_dir + 'apperror.log'), {'flags': 'a'});
  slog.write('\n<-- new error -->\n');
  slog.end('\n' + err.message + '\n' + err.stack +'\n')
  setTimeout(function(){
    //let the process write the log
    process.kill(0)
  },150)
})

/* Routes  */

/* 
 * Homepage Showcase
 * 
 */
app.get('/', function (req, res, next) {
  res.sendfile(__dirname +'/public/index.html')
});
app.get('/api', function (req, res, next) {
  res.sendfile(__dirname +'/public/api.html')
});
app.get('/help', function (req, res, next) {
  res.sendfile(__dirname +'/public/help.html')
});
app.get('/about', function (req, res, next) {
  res.sendfile(__dirname +'/public/about.html')
});
app.get('/admin', function (req, res, next) {
  res.redirect('http://admin.nodester.com');
});
app.get('/irc', function (req, res, next) {
  res.redirect('http://irc.nodester.com');
});


/*
 * shorthands
*/
var auth       = middle.authenticate
  , authApp    = middle.authenticate_app
  , authAdmin  = middle.authenticate_admin
  , deprecated = middle.deprecated
 ;

/* 
 * Status endPoint 
 * @Public: true
 * @HTTP method: http://api.host.com/status
 * @raw:  curl http://api.host.com/status
 * @cli: nodester status
 */
var status = require('./lib/status');

app.get('/status', status.get);

app.get('/status.json', function (req, res, next) {
  res.redirect('http://status.nodester.com');
});
/*
 * New coupon request
 * @Public: true
 * @raw:
 *    # send coupon
 *    curl -X POST -d "email=dan@nodester.com" http://localhost:4001/coupon
 *: curl http://localhost:4001/unsent
 * @cli: nodester coupon
 */

var coupon = require('./lib/coupon');
app.post('/coupon', coupon.post);
app.get('/unsent', coupon.unsent);

/*
 * User actions
 */

var user = require('./lib/user');

/*
 * New user account registration
 * @Public: true with params
 * @params: user,password,email,coupon
 * @raw:  curl -X POST -d "user=testuser&password=123&email=chris@nodefu.com&coupon=hiyah" http://localhost:4001/user
 *        curl -X POST -d "user=me&password=123&coupon=hiyah" http://localhost:4001/user
 * @cli: nodester user register <coupon-code>
 */

app.post('/user', user.post);


/*
 * Edit your user account
 * @Public: false, only with authentication
 * @raw: curl -X PUT -u "testuser:123" -d "password=test&rsakey=1234567" http://localhost:4001/user
 * @cli: nodester user 
 */

app.put('/user', auth, user.put);


/*
 * Delete your user account
 * @Public: false, only with authentication
 * @raw: curl -X DELETE -u "testuser:123" http://localhost:4001/user
 * @cli: not available,security issues
*/
app.del('/user', auth, user.delete);

/*
 * Apps related info
 */
var apps = require('./lib/apps');

/* 
 * All Applications info
 * @HTTP: http://chris:123@localhost:4001/apps
 * @raw: curl -u "testuser:123" http://localhost:4001/apps
 * @cli: nodester apps
 */
app.get('/apps', auth, apps.get);

/*
 * App actions
 * @Public: false
 */
var _app_ = require('./lib/app')


/* 
 * Application info
 * @HTTP: http://chris:123@localhost:4001/apps/<appname>
 * @raw: curl -u "testuser:123" http://localhost:4001/apps/<appname>
 * @cli: nodester app info <appname>
 */ 
app.get('/apps/:appname', auth, authApp, _app_.get);
app.get('/app/:appname', deprecated, auth, authApp, _app_.get); // deprecated

/*
 * Create node app
 * @raw: curl -X POST -u "testuser:123" -d "appname=test&start=hello.js" http://localhost:4001/apps
 * @cli: nodester app create <appname> <initfile.js>
*/

app.post('/apps/:appname', auth, _app_.post);
app.post('/apps', auth, _app_.post);
app.post('/app', deprecated, auth, _app_.post);

/*
 * App backend restart|start|stop handler
 * @Public : true
 * @HTTP   : http://api.test.com/app_restart
 * @cli: nodester app restart|start|stop <appname>
 */
app.get('/app_restart', _app_.app_restart);
app.get('/app_start', _app_.app_start);
app.get('/app_stop', _app_.app_stop);

/*
 * Update node app
 * @Public  false only with auth
 * @params  start=initfile.js
 * @params  running=true|false (stop,start)
 * Raw output:
 *    curl -X PUT -u "testuser:123" -d "start=hello.js" http://localhost:4001/apps/test  
 *    curl -X PUT -u "testuser:123" -d "running=true" http://localhost:4001/apps/test
 *    curl -X PUT -u "testuser:123" -d "running=false" http://localhost:4001/apps/test
 *    curl -X PUT -u "testuser:123" -d "running=restart" http://localhost:4001/apps/test
 * TODO - Fix this function, it's not doing callbacking properly so will return JSON in the wrong state!
*/

app.put('/apps/:appname', auth, authApp, _app_.put);
app.put('/app', deprecated, auth,authApp, _app_.put); // deprecated

/*
 * Admin tasks
 */
app.put('/app/audit', authAdmin,_app_.audit);
app.put('/app/restart/:appname', authAdmin, _app_.restartByName);

/*
 * Delete your nodejs app
 * @Public : false (with auth onlye)
 * @raw    : curl -X DELETE -u "testuser:123" -d http://localhost:4001/apps/test
 */
app.del('/apps/:appname', auth, authApp, _app_.delete);
app.del('/app/:appname',deprecated, auth, authApp, _app_.delete); // deprecated
app.del('/gitreset/:appname', auth, authApp, _app_.gitreset);

/*
 * Logs
 * @Public: false
 * @raw: curl -u "testuser:123" -d "appname=test" http://localhost:4001/applogs
 */
app.get('/applogs/:appname', auth, authApp, _app_.logs);

/* 
 * Retrieve information about or update a node app's ENV variables
 * This fulfills all four RESTful verbs.
 * @method: GET will retrieve the list of all keys.
 * @method: PUT will either create or update.
 * @method: DELETE will delete the key if it exists.
 * Raw output: 
 *     curl -u GET -u "testuser:123" -d "appname=test" http://localhost:4001/env
 *     curl -u PUT -u "testuser:123" -d "appname=test&key=NODE_ENV&value=production" http://localhost:4001/env
 *     curl -u DELETE -u "testuser:123" -d "appname=test&key=NODE_ENV" http://localhost:4001/env
 *
 * Get info about available versions.
 * @raw: curl -XGET http://localhost:4001/env/version
 */

app.get('/env/version', _app_.env_version);

/*
 * Get info about a specific version and see if it's installed
 * without need of basic auth
 * @raw: curl -XGET http://localhost:4001/env/:version
 */
app.get('/env/version/:version', _app_.check_env_version);
app.get('/env/:appname', auth, authApp, _app_.env_get);
app.put('/env', auth, authApp, _app_.env_put);
app.del('/env/:appname/:key', auth, authApp, _app_.env_delete);

/*
 * APP NPM Handlers
 */
var npm = require('./lib/npm');

/* 
 * Install package
 * @raw: 
 *    curl -X POST -u "testuser:123" -d "appname=test&package=express" http://localhost:4001/appnpm
 *    curl -X POST -u "testuser:123" -d "appname=test&package=express" http://localhost:4001/npm
 *    curl -X POST -u "testuser:123" -d "appname=test&package=express,express-extras,foo" http://localhost:4001/npm
 */
 
app.post('/appnpm', auth, authApp, npm.post);
app.post('/npm', auth, authApp, npm.post);

/*
 * Domain handler
 */
var domains = require('./lib/domains');

/*
 * Point domains to nodester
 * @raw: curl -X POST -u "testuser:123" -d "appname=test&domain=<domainname>" http://localhost:4001/appdomains
 *       curl -X DELETE -u "testuser:123" -d "appname=test&domain=<domainname>" http://localhost:4001/appdomains
 * @cli: nodester domains
 */

app.post('/appdomains', auth, authApp, domains.post);
app.del('/appdomains/:appname/:domain', auth, authApp, domains.delete);
app.get('/appdomains', auth, domains.get);

/*
 * Reset Password actions
 * @raw: curl -X POST -d "user=username" http://localhost:4001/reset_password
 *       curl -X PUT -d "password=newpassword" http://localhost:4001/reset_password/<token>
 */
var reset_password = require('./lib/reset_password');
app.post('/reset_password', reset_password.post);
app.put('/reset_password/:token', reset_password.put);

// default listener
app.listen(4001);

log.info('Nodester app started on port %d', app.address().port);

app.get('/*', function (req, res) {
  throw new NotFound;
});

function NotFound(msg) {
  this.name = 'NotFound';
  Error.call(this, msg);
  Error.captureStackTrace(this, arguments.callee);
};

// Globalization of log
process.log = log 

/* End of file */
