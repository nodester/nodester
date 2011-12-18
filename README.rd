= Nodester is an Open Source Node.JS Hosting Platform with a RESTful API and CLI

Nodester is a free and open source Node.JS hosting platform and service for managing multi-tenant hosted NodeJS apps.  It consists of an RESTful API that allows developers to create and manage NodeJS apps online as well as a command line interface to simply steps instead of using cURL.  NodeJS apps names are assigned as subdomains that proxy to ports with an assigned addresses.  Git is used to push updates to Nodester and instances (dynos) are launched using post-receive hooks so that they run until you stop them.

Give our platform a spin at http://nodester.com

== Installing Nodester on Amazon EC2, Rackspace, GoGrid, or your own datacenter services

Please see install.txt for setup instructions (https://github.com/nodester/nodester/blob/master/install.txt)

== RESTful API Documentation

  COUPON
  /coupon - creates coupon request for early access (pass in email) - <b>Note: This resource does not use base api url
  curl -X POST -d "email=chris@nodester.com" http://localhost:8080/coupon

  STATUS
  /status - returns status of the platform and number of nodejs apps running
  // curl http://api.localhost:8080/status

  USER
  /user - creates user account (pass in user and password and email) - Note: This resource does not use the api subdomain
  curl -X POST -d "user=testuser&password=123&email=chris@nodester.com" http://localhost:8080/user

  /user - delete user account (requires basic auth)
  curl -X DELETE -u "testuser:123" http://api.localhost:8080/user

  APP
  /app - create nodejs app for hosting (requires basic auth and returns the port address required for use along with a git repo to push to)
  curl -X POST -u "testuser:123" -d "appname=a&start=hello.js" http://api.localhost:8080/app

  Get information about an app
  curl -u "testuser:123" http://api.localhost:8080/app/a

  Start or stop an app using running=true|false
  curl -X POST -u "testuser:123" -d "appname=a&running=true" http://api.localhost:8080/app
  curl -X POST -u "testuser:123" -d "appname=a&running=false" http://api.localhost:8080/app

  /app - update nodejs app for hosting (requires basic auth, appname, and starting page and returns the port address required for use along with a git repo to push to)
  curl -X PUT -u "testuser:123" -d "appname=a&start=hello1.js" http://api.localhost:8080/app

  /app - delete nodejs app (requires basic auth and appname)
  curl -X DELETE -u "testuser:123" -d "appname=test" http://api.localhost:8080/app

  /app - get nodejs app info (requires basic auth and appname)
  curl -u "testuser:123" http://api.localhost:8080/app/appname

  /apps - get all your apps info (requires basic auth)
  curl -u "testuser:123" http://api.localhost:8080/apps

  ENV
  /env - create/update environment key/value pair (requires basic auth, appname, and environment key and value)
  curl -X PUT -u "testuser:123" -d "appname=a&key=color&value=blue" http://api.nodester.com/env

  /env - delete environment key/value pair (requires basic auth, appname, and environment key)
  curl -X DELETE -u "testuser:123" -d "appname=test&key=color" http://api.nodester.com/env

  /env - get environment info (requires basic auth, appname)
  curl -u "testuser:123" http://api.nodester.com/env/appname

  NPM
  /npm - install, update and uninstall npm packages to your application
  curl -X POST -u "testuser:123" -d "appname=a&action=install&package=express" http://api.localhost:8080/npm
  curl -X POST -u "testuser:123" -d "appname=a&action=update&package=express" http://api.nodester.com/npm
  curl -X POST -u "testuser:123" -d "appname=a&action=uninstall&package=express" http://api.nodester.com/npm

== CLI Documentation

Installation of our Command Line Interface is simple using NPM.

  npm install nodester-cli -g

Operations are as simple as nodester <command> <param1> <param2>.  Here is a list of the commands available today:

  nodester coupon <email address>
  nodester user create <username> <password> <email address> <file containing ssh public key> <coupon code>
  nodester user setup <username> <password>

  The commands below require you to have run 'user setup' before/
  nodester user setpass <new password>

  You should run user setup after running setpass:
  nodester user setkey <file containing ssh public key>
  nodester apps list
  nodester app create <app-name> <initial js file>
  nodester app info <app-name>
  nodester app logs <app-name>
  nodester app start <app-name>
  nodester app restart <app-name>
  nodester app stop <app-name>
  nodester npm install <app-name> <package name>
  nodester npm upgrade <app-name> <package name>
  nodester npm uninstall <app-name> <package name>
  nodester appdomain add <app-name> <domain-name>
  nodester appdomain delete <app-name> <domain-name>

== Testing Locally

Subdomains can be tested locally by editing /etc/hosts like this:
127.0.0.1	localhost a.localhost b.localhost c.localhost
save etc/hosts and flush DNS like this: sudo dscacheutil -flushcache

  http://localhost:80 = Homepage
  http://a.localhost:80 = Runs app associated with subdomain a on couch-configured port
  http://b.localhost:80 = Runs app associated with subdomain b on couch-configured port
  http://chris:123@api.localhost:80/status = API to list status of all node apps

== Todos

We are always looking for areas to improve Nodester!  Here are a few of the big ideas on our list

* Setup public AMI running Nodester
* Ability to start app with additional instances (dynos)
* Horizontal scaling

Feel free to suggest improvements at https://github.com/nodester/nodester/issues

== Core Team Members

@ChrisMatthieu (http://twitter.com/chrismatthieu)
@DanBUK (http://twitter.com/danbuk)
@Marcosvm (http://twitter.com/marcosvm)
@WeAreFractal (http://twitter.com/wearefractal)

If this project inspires you, please feel free to help out by forking this project and sending us pull requests! \m/
http://github.com/nodester

== Need Help?

Hit us up in IRC at irc.freenode.net #nodester or http://irc.nodester.com
You can also ask questions and provide feedback in our google group at http://groups.google.com/group/nodester


