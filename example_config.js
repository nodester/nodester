exports.opt = {
  couch_user: 'bejesus',
  couch_pass: 'password',
  couch_host: "127.0.0.1",
  couch_port: 5984,
  couch_prefix: 'test',
  couch_tables: ['coupons', 'nodefu', 'nextport', 'apps'],
  home_dir: '/var/bejesus',
  app_dir: '/var/bejesus/bejesus',
  hosted_apps_subdir: 'hosted_apps', // This should be a subfolder of home_dir
  tl_dom: 'testbejes.us',
  api_dom: 'api.testbejes.us',
  git_user: 'bejesus',
  git_dom: 'testbejes.us',
  coupon_code: 'PlzCanIHazNodeJS',
  blocked_apps: ['www', 'api', 'support', 'dan']
};
