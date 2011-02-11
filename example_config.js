exports.opt = {
  couch_user: 'nodester',
  couch_pass: 'password',
  couch_host: "127.0.0.1",
  couch_port: 5984,
  couch_prefix: 'nodester',
  couch_tables: ['coupons', 'nodefu', 'nextport', 'apps', 'repos', 'aliasdomains'],
  home_dir: '/var/nodester',
  app_dir: '/var/nodester/nodester',
  hosted_apps_subdir: 'hosted_apps', // This should be a subfolder of home_dir - TODO - Change this..
  proxy_table_file: '/var/nodester/var/proxy_table.json',
  tl_dom: 'testnodester.com',
  api_dom: 'api.testnodester.com',
  git_user: 'nodester',
  git_dom: 'testnodester.com',
  coupon_code: 'CouponCode',
  blocked_apps: ['www', 'api'],
  restart_key: 'KeepThisSecret',
  userid: "nodester",
  enable_ssl: false, // Currently SSL forward to the app/api, when I have a wildcard cert to test, then all apps can have SSL.
  ssl_ca_file: "",
  ssl_cert_file: "",
  ssl_key_file: ""
};
