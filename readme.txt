NodeFu (http://nodefu.com) = Node.js Hosting Services

This is an *experimental* service for managing hosted nodejs apps.  It consists of an API that allows developers to create and manage nodejs apps.  Node apps are assigned subdomains (pending) that proxy (https://github.com/nodejitsu/node-http-proxy) to ports with an assigned address.  Instances (dynos) are launched using Forever (https://github.com/indexzero/forever).

Dependencies:
Node.js and the following NPM modules: forever, http-proxy, express

Flow:
Launch proxy.js to start services and it will launch app.js (node proxy.js)
- forever start proxy.js (launches proxy server redirecting port 8080 traffic to appropriate node app)
- forever start app.js (launches API on port 4000 for creating and managing node apps)

APIs:
NodeFu Create = Inputs (basicauth, appname) / Outputs (status, appid, port)
NodeFu Start = Inputs (basicauth, appid, dynos) / Outputs (status)
NodeFu Stop = Inputs (basicauth, appid, dynos) / Outputs (status)
NodeFu List = Inputs (basicauth) / Outputs ([appid, status])

Test:
Homepage: http://localhost:8080 
Access hello8124.js app on port 8124: http://localhost:8080/8124
Access hello8125.js app on port 8125: http://localhost:8080/8125
Access API: http://localhost:8080/api/2.json

Todos:
- Look into using Fugue instead of Forever to better control instances
- Push apps (git local repos?, github raw?, ...)

Read git with node - https://github.com/creationix/node-git
ruby-git - https://github.com/christkv/node-git

License:
Apache 2 - Have fun! :)
