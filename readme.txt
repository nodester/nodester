NodeFu (http://nodefu.com) = Node.js Hosting Services

This is an experimental service for managing hosted nodejs apps.  It consists of an API that allows developers to create and manage nodejs apps in seconds.  Node apps are assigned subdomains that proxy (https://github.com/nodejitsu/node-http-proxy) to ports with an assigned address.  Instances (dynos) are launched using Forever (https://github.com/indexzero/forever).

Dependencies:
Node.js and the following NPM modules: forever, http-proxy, express

Flow: (To start simply launch proxy.js and it will launch app.js)
forever start proxy.js (launches proxy server redirecting port 8080 traffic to appropriate node app)
forever start app.js (launches API on port 4000 for creating and managing node apps)

APIs:
NodeFu Create = Inputs (basicauth, appname) / Outputs (status, appid, port)
NodeFu Start = Inputs (basicauth, appid, dynos) / Outputs (status)
NodeFu Stop = Inputs (basicauth, appid, dynos) / Outputs (status)
NodeFu List = Inputs (basicauth) / Outputs ([appid, status])

Todos:
Push apps (git?, github raw?, ...)

Read git with node - https://github.com/creationix/node-git
ruby-git - https://github.com/christkv/node-git

License:
Apache 2 - Have fun! :)
