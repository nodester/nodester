# How to install nodester in you personal cloud.

_Nodester - A node.js hosting platform_

**If you want you can use the [nodester-installer](http://github.com/nodester/nodester-installer), still work in progress, but functional.**

The only thing that you need to setup your personal instance is `ssh` access- Like this:

    > ssh -t root@yourserver.com

## Dependencies:


- bouncy
- node.js (Latest stable version 0.4.11)
- npm
- curl
- node.js Modules:
  -  # http-proxy -- Included in libs/3rdparty due to changes at are not in upstream yet
  -  pool
  -  express
  - request
  - npm-wrapper
  - daemon
  - forever
  - cradle
  - coloured
  - coffee-script

## Installation:

Nodester was/is build on node 0.4.x so we recommend to have as the default version the 0.4.9 one or any of the 0.4.x series installed in your server. Since nodester is able to manage multiple versions of node.js, you can install [`n`]("http://github.com/visionmedia/n") before node.js or after it. We recommend to install before node.js:

    > git clone https://github.com/nodester/n.git
    > cd n
    > make
    > make install

Check if `n` is installed correctly, otherwise (inside `n` dir):

    > sudo cp bin/n /usr/local/bin

Then you can use `n` as a node.js version manager, like this:

    > n 0.4.9  #which is currently used by nodester

**note**: It's a good practice to install any node.js version as root.
Then go to [here](#a)

If you don't want to git#clone the repo, follow these instructions:

First of all you'll need some packages to make nodester work, the only one that you need to manually install are node.js, npm, curl and forever as follows:

    > Install node.js (0.4.x recommended) as you prefer (wget/pkg/git clone)

Install npm:
  
    > curl http://npmjs.org/install.sh | sh

Install n (for multiple version support):

    > npm install n -g

Then install again node 0.4.x as n child:

    > n 0.4.x

The `n` command will handle all the installation process from the version, this is done from this way, so we after can use `n use 0.4.x` as unique method to run application. Meanwhile you are install node again trough `n` setup the user and the permissions needed to run your personal instance of `nodester`.

<a name="a" />
### Create the environment

**Create a user and group to run nodester as (do this as root)**

    > sudo su -
    > groupadd nodester
    > useradd -d /var/nodester -c "nodester" -g nodester -m -r -s /bin/bash nodester
    > passwd nodester

Then login to the account `nodester` and ensure that .ssh/authorized_keys exists:

    > ssh nodester@yourhost
    > cd ~
    > mkdir .ssh
    > touch .ssh/authorized_keys
    > chmod go-rwx .ssh/authorized_keys
  
Update sudoers to allow running of the proxy on port 80 (do this as root), and umount of git repos:

    > sudo visudo

And add the following lines:

    nodester ALL = NOPASSWD: /var/nodester/nodester/bin/proxy_start.sh *
    nodester ALL = NOPASSWD: /var/nodester/nodester/bin/proxy_stop.sh
    nodester ALL = NOPASSWD: /var/nodester/nodester/bin/app_start.sh *
    nodester ALL = NOPASSWD: /var/nodester/nodester/bin/app_stop.sh *

Export paths (to make npm work):

    > cd ~
    > echo -e "root = ~/.node_libraries\nmanroot = ~/local/share/man\nbinroot = ~/bin" > ~/.npmrc
    > echo -e "export PATH=\"\${PATH}:~/bin\";" >> ~/.bashrc
    > source ~/.bashrc

*(Optional)* Sometimes at deploying with previous versions of npm can be difficult and annoying, **This part is a hack to use the old npm with the new node until certain packages can catch up and be installed with npm@0.3.x**

    > mkdir ~/src
    > cd src
    > git clone git://github.com/isaacs/npm.git ./npm
    > cd npm
    > git checkout origin/0.2
    > make dev

*(Optional)* Fetch 0.2.6 version of node for npm

    > cd ~/src
    > sudo mkdir -p /usr/local/n/versions/
    > wget http://nodejs.org/dist/node-v0.2.6.tar.gz
    > tar -vzxr node-v0.2.6.tar.gz
    > cd node-v0.2.6
    > ./configure --prefix=/usr/local/n/versions/0.2.6
    > make
    > sudo make install

    > cd ~/bin
    > cp npm\@0.2.18 nodester-npm
    > vim nodester-npm

Replace `'#!/usr/bin/env node'` with `'#!/usr/local/n/versions/0.2.6/bin/node'`


## Install dependencies

Install node-module dependencies (do this as nodester)

    > for X in pool express npm-wrapper request daemon forever cradle coloured; do npm install ${X}; done

Get nodester (do this as nodester)

    > cd ~
    > git clone git://github.com/nodester/nodester.git
    > cd nodester

Ensure that the ownership of nodester/proxy is all root for security (do this as root)

    > cd /var/nodester
    > sudo chown -R root:root nodester/proxy

Install the git folder shell to restrict git to per user folders (do this as root)

    > cd /var/nodester/nodester
    > sudo cp scripts/git-shell-enforce-directory /usr/local/bin
    > sudo chmod +x /usr/local/bin/git-shell-enforce-directory

## Configuration

User: `nodester` (`ssh nodester@...`)

You'll need to either install CouchDB or get a CouchOne|iriscouch|cloudant account, then copy `nodester/example_config.js` to `nodester/config.js`, and edit the settings in nodester/config.js, basically in this file you define the couchdb url `git` dir and `app` dir also you define the `couchdb` url, the email support, your personal domain and the one of the most important parts the `proxy_table`. You definetely want to take a look to all the options. 

The example config.js looks like this:

    // config.js
    exports.opt = {
      couch_user: 'alejandromg', 
      couch_pass: 'alejandromg_password',
      couch_host: 'nodester.iriscouch.com', 
      couch_port: 5984,
      couch_prefix: 'nodester',
      couch_tables: ['coupons', 'nodefu', 'nextport', 'apps', 'repos', 'aliasdomains', 'password_resets'],
      home_dir: '/var/nodester', // if you did all the steps above you don't need to change this
      app_dir: '/var/nodester/nodester', // and this
      git_home_dir: '/git', // we prefer root dirs
      apps_home_dir: '/app', // same here
      public_html_dir: '/var/nodester/nodester/public',
      proxy_table_file: '/var/nodester/var/proxy_table.json',
      tl_dom: 'example.co',
      api_dom: 'api.example.co',
      git_user: 'nodester',
      git_dom: 'nodester.example.co',
      coupon_code: 'test', // The initial coupon code
      blocked_apps: ['www', 'api', 'admin', 'support', 'blog', 'site'],
      restart_key: 'test', // this is the key you'll need after in gitrepoclone.sh
      userid: 'nodester',
      app_uid: 100,
      enable_ssl: false, // Currently SSL forward to the app/api, when I have a wildcard cert to test, then all apps can have SSL.
      ssl_ca_file: '',
      ssl_cert_file: '',
      ssl_key_file: '',
      node_base_folder: '/opt/node-v0.4.9_npm_v1.0.3',

      //Amazon SES mail info
      SES: {
        AWSAccessKeyID: 'ACCESSKEY',
        AWSSecretKey: 'SECRETKEY',
        ServiceUrl: 'https://email.us-east-1.amazonaws.com',
      }
    };

Also copy `scripts/example_gitrepoclone.sh` to `scripts/gitrepoclone.sh` and update it with the key you specified in `config.js`.

### The chroot template

The way in how nodester works is pretty straigthforward, so, when a user does a `nodester app restart|start` nodester takes the `node_base_folder` param and it use it to create|mount the sandbox for the app, the `node_base_folder` has the whole environment in which the node-versions are installed and everything that an app needs to work. Soon we are going to publish an example of this environment. So you can install it easily. 

### Multiple versions of node:

User: `root`

We've created a script to install all the versions of node with a single line:

    > cd /var/nodester/nodester/
    > bin/install_versions.js --run

**warning**: As you may know compiling node.js can take long, so imagine installing ~20 versions of node.js from once, that would be awful and you'll better get some coffee and wait. So, you can add something like this:

    > bin/install_versions.js -v 0.4.9

Which can be done also with `n` directly: `n 0.4.9` for example.

Programmatically you can also require the `install_versions.js` module, and then install the version you want:
    
    // installer.js
    var installer = require('./bin/install_versions.js');
    installer('0.5.9')


### Setting up the database

user: `nodester`

First you'll need to seed the CouchDB tables:

    > cd ./nodester/scripts/couchdb/
    > ./create_all_couchdb_tables.js
    > ./create_all_couchdb_tables.js
    > ./setup_default_views.js

### Finals steps

user: `nodester` 

If you did all the steps correctly, you are ready to go, but first let's create the forever dir and the `proxy_table.json`:

    > cd ~
    > mkdir -p .forever/logs
    > mkdir -p nodester/var/
    > echo '{"example.co":4001, "api.example.co":4001}' > nodester/var/proxy_table.json

Also you might want to chown the proxy_table to nodester:

    > sudo chown $USER -R nodester/var/proxy_table.json

## Ready, set, GO!

Start up the proxy and main/api app (do this as nodester):

    > cd nodester
    > ./bin/app_start.sh && sudo ./bin/proxy_start.sh
  
Test the web frontend at 127.0.0.1:80 or example.co, and the api too api.example.co

#### Create a user

The coupon can be the one you define in `config.js`.
    
    > curl -X POST -d "coupon=mycoupon&user=testuser&password=123&email=chris@nodester.com&rsakey=ssh-rsa AAAAB3NzaC1yc..." http://example.co/user

#### Create an app

Creates nodejs app for hosting (requires basic auth and returns the port address required for use along with a git repo to push to):

    > curl -X POST -u "testuser:123" -d "appname=a&start=hello.js" http://api.example.co/app

This action return the git repo url, so, you may want to copy that and add it to the `remote` in your local git repo.

    {"status":"success","port":10029,"gitrepo":"nodester@nodester.example.co:/git/test/30-edd3ed1cc9998703e507b56cb1c495e0.git","start":"app.js","running":false,"pid":"unknown"}

Make changes to your repo and:

### Start the app

    > curl -X PUT -u "testuser:123" -d "appname=a&running=true" http://api.example.com/app

### Test the app

GOTO-> appname.example.co 

### Rejoice!


Sidenotes:

**More info about the REST API: http://nodester.com/api.html#rest**

Don't like the REST API way? Try the [`nodester-cli`](http://github.com/nodester/nodester-cli).

### Credits

- [Nodester]("http://nodester.com")
- `n` By [TJ Holowaychuk]("http://github.com/visionmedia")