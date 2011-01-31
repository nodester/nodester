Nodester (http://nodester.com) = Node.js Hosting Platform

This is an *experimental* service for managing hosted nodejs apps.  It consists of an API that allows developers to create and manage nodejs apps.  Node apps are assigned subdomains that proxy to ports with an assigned address.  Instances (dynos) are launched using Forever so that they run until you stop them or using Nodemon where they run until a file changes from a git update.

Please see install.txt for setup instructions.

API Documentation:

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

/appnpm - install, update and uninstall npm packages to your application
curl -X POST -u "testuser:123" -d "appname=a&action=install&package=express" http://api.localhost:8080/appnpm

Testing:
Subdomains can be tested by editing /etc/hosts like this:
127.0.0.1	localhost a.localhost b.localhost c.localhost
save etc/hosts and flush DNS like this: sudo dscacheutil -flushcache

http://localhost:8080 = Homepage
http://a.localhost:8080 = Runs app associated with subdomain a on couch-configured port
http://b.localhost:8080 = Runs app associated with subdomain b on couch-configured port
http://chris:123@api.localhost:8080/status = API to list status of all node apps
http://chris:123@api.localhost:8080/list/2.json = API TBD

Todos:
- add rsa keys for private repos (gitolite or gitosis?)
- add ability to control number of instances
- Add Command Line Interface
- Add SSL support
- Add better error handling

Considerations:
- 64k port limitation per IP address on Linux - how do we scale horizontally?
  -- We can using 127.0.0.X so aliases on lo device
- sandbox node instances?
  -- Chroot?

Contribute:
If this project inspires you, please feel free to help out by forking this project and sending me pull requests.

License:
Apache 2 - Have fun! :)
