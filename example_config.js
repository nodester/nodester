exports.opt = {
  couch_user: 'nodester',
  couch_pass: 'password',
  couch_host: "127.0.0.1",
  couch_port: 5984,
  couch_prefix: 'test',
  couch_tables: ['coupons', 'nodefu', 'nextport', 'apps', 'repos'],
  home_dir: '/var/nodester',
  app_dir: '/var/nodester/nodester',
  hosted_apps_subdir: 'hosted_apps', // This should be a subfolder of home_dir
  tl_dom: 'testnodester.com',
  api_dom: 'api.testnodester.com',
  git_user: 'nodester',
  git_dom: 'testnodester.com',
  coupon_code: 'PlzCanIHazNodeJS',
  blocked_apps: ['www', 'api', 'support', 'dan'],
  restart_key: 'KeepThisSecret'
};
