# Nodester is an Open Source Node.JS Hosting PaaS with a RESTful API and CLI

Nodester is a free and open source Node.JS hosting platform and service for managing multi-tenant hosted NodeJS apps.  It consists of an RESTful API that allows developers to create and manage NodeJS apps online as well as a command line interface to simply steps instead of using cURL.  NodeJS apps names are assigned as subdomains that proxy to ports with an assigned addresses.  Git is used to push updates to Nodester and instances (dynos) are launched using post-receive hooks so that they run until you stop them.

## Demo

Give our platform a spin at http://nodester.com

Watch our video on how-to build and deploy a Node.JS application to Nodester in only 39 seconds!
http://youtu.be/jwsP1Ejv-_w

## Request a free hosting coupon today

``` bash
  curl -X POST -d "email=you@gmail.com" http://nodester.com/coupon
```

## Installing the Nodester CLI

``` bash
  npm install nodester-cli -g
``` 

## CLI and RESTful API Documentation

* CLI: http://nodester.com/api.html
* REST API: http://nodester.com/api.html#rest
* Apigee's API Explorer: http://nodester.com/api.html#explorer

## Installing Nodester on Amazon EC2, Rackspace, GoGrid, or your own datacenter services

Please see install.txt for setup instructions (https://github.com/nodester/nodester/blob/master/install.txt)

## Testing Locally

Subdomains can be tested locally by editing /etc/hosts like this:
127.0.0.1	localhost a.localhost b.localhost c.localhost
save etc/hosts and flush DNS like this: sudo dscacheutil -flushcache

*  http://localhost:80 # Homepage
*  http://a.localhost:80 # Runs app associated with subdomain a on couch-configured port
*  http://b.localhost:80 # Runs app associated with subdomain b on couch-configured port
*  http://chris:123@api.localhost:80/status # API to list status of all node apps

## Todos

We are always looking for areas to improve Nodester!  Here are a few of the big ideas on our list

* Setup public AMI running Nodester
* Write an install.js script and npm installer module
* Ability to start app with additional instances (dynos)
* Horizontal scaling

Feel free to suggest improvements at https://github.com/nodester/nodester/issues

## Core Team Members

* @ChrisMatthieu (http://twitter.com/chrismatthieu)
* @WeAreFractal (http://twitter.com/wearefractal)
* @Marcosvm (http://twitter.com/marcosvm)

If this project inspires you, please feel free to help out by forking this project and sending us pull requests! \m/
http://github.com/nodester

## Need Help?

* Hit us up in IRC at irc.freenode.net #nodester or http://irc.nodester.com
* You can also ask questions and provide feedback in our google group at http://groups.google.com/group/nodester


