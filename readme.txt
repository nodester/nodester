NodeFu (http://nodefu.com) = Node.js Hosting Services

This is an *experimental* service for managing hosted nodejs apps.  It consists of an API that allows developers to create and manage nodejs apps.  Node apps are assigned subdomains that proxy to ports with an assigned address.  Instances (dynos) are launched using Forever so that they run until you stop them.

Dependencies:
Node.js and the following NPM modules: forever, http-proxy, express, node-base64, couch-client
CouchDB instance or CouchOne account

Get Started:
Launch proxy.js to start services and it will launch app.js (node proxy.js)
- forever start proxy.js (launches proxy server redirecting port 8080 traffic to appropriate node app)
- proxy performs forever start app.js (launches API on port 4000 for creating and managing node apps)

API Documentation:

USERS
/register - creates user account (pass in user and password)
curl -X POST -d "user=testuser&password=123" http://localhost:8080/register

/destroy - delete user account (requires basic auth)
curl -X DELETE -u "testuser:123" http://api.localhost:8080/destroy

APPS
/apps - create nodejs app for hosting (requires basic auth and returns the port address required to use)
curl -X POST -u "testuser:123" -d "appname=test&start=hello.js" http://api.localhost:8080/apps

/apps - delete nodejs app (requires basic auth and appname)
curl -X DELETE -u "testuser:123" -d "appname=test" http://api.localhost:8080/apps



NodeFu Create = Inputs (basicauth, appname) / Outputs (status, appid, port)
NodeFu Start = Inputs (basicauth, appid, dynos) / Outputs (status)
NodeFu Stop = Inputs (basicauth, appid, dynos) / Outputs (status)
NodeFu Status = Inputs (basicauth) / Outputs ([appid, status])


Testing:
Subdomains can be tested by editing /etc/hosts like this:
127.0.0.1	localhost a.localhost b.localhost c.localhost
save etc/hosts and flush DNS like this: sudo dscacheutil -flushcache

http://localhost:8080 = Homepage
http://a.localhost:8080 = Runs hello8124.js app on port 8124
http://b.localhost:8080 = Runs hello8125.js app on port 8125
http://chris:123@api.localhost:8080/status = API to list status of all node apps
http://chris:123@api.localhost:8080/list/2.json = API TBD

Register user:
curl -X POST -d "user=testuser&password=123" http://localhost:8080/register



Todos:
- Look into using Fugue instead of Forever for better instance control
- Connect to hosted CouchDB or Mongo instance for user authentication and app registration
- API updates to control instances
- Add Command Line Interface
- Push apps (git local repos?, github raw?, ...)
Read git with node - https://github.com/creationix/node-git
ruby-git - https://github.com/christkv/node-git

Contribute:
If this project inspires you, please feel free to help out by forking this project and sending me pull requests.

License:
Apache 2 - Have fun! :)
