exports.opt = {
  // Domains
  top_level_domain: '<TLD>', // testnodester.com
  blocked_apps: ['www', 'api', 'admin', 'code', 'irc'],

  // Api
  api_domain: 'api.<TLD>', // api.testnodester.com
  coupon_code: '<CouponCode>',
  restart_key: '<RestartKey>',

  // CouchDB server
  couch_user: '<CouchUser>', // nodester
  couch_pass: '<CouchPass>', // password
  couch_host: '<CouchHost>', // 127.0.0.1
  couch_port: <CouchPort>, // 5984
  couch_prefix: '<CouchPrefix>', // node
  couch_tables: ['coupons', 'nodefu', 'nextport', 'apps', 'repos', 'aliasdomains'],

  // Nodester main server - proxy & core apps
  main_host: '<MainHost>', // 127.0.0.1
  main_user: '<MainUser>', // nodester
  main_home_dir: '<MainHomeDir>', // /var/nodester
  main_app_dir: '<MainHomeDir>/nodester',
  main_static_dir: '<MainHomeDir>/nodester/public',
  main_app_uid: 1000,
  main_app_port: 4001,
  proxy_table_file: '<MainHomeDir>/var/proxy_table.json',

  // Git Server
  git_host: '<GitHost>', // 127.0.0.1
  git_user: '<GitUser>', // git
  git_home_dir: '<GitHomeDir>', // /home/git

  // App Servers
  apps_hosts: '<AppsHost>', // 127.0.0.1
  apps_user: '<AppsUser>', // apps
  apps_home_dir: '<AppsHomeDir>', // /home/nodester/apps
  
  // SSL
  enable_ssl: false, // Currently SSL forward to the app/api, when I have a wildcard cert to test, then all apps can have SSL.
  ssl_ca_file: '',
  ssl_cert_file: '',
  ssl_key_file: '',
  
  // NodeJS
  node_base_folder: '/opt/node-v0.4.9_npm_v1.0.3'
};
