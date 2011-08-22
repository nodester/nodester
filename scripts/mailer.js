#!/usr/bin/env node

var mailer = require('mailer'),
  lib = require('../lib/lib'),
  config = require('../config'),
  username = config.opt.smtp_username,
  password = config.opt.smtp_password,
  host = config.opt.smtp_host,
  port = config.opt.stmp_port;

var resets = lib.get_couchdb_database('password_resets');

function send_email(doc) {
  mailer.send({
    port: config.opt.smtp_port,
    domain: config.opt.smtp_domain,
    username: config.opt.smtp_username,
    password: config.opt.smtp_password,
    authentication: config.opt.smtp_auth,
    to: doc.id,
    from: "<notifier@nodester.com>",
    subject: "Password reset request",
    body: "That's your password request token: " + doc.value.token + "\n\nYou can reset your password via Nodester API or CLI"
  }, function(err, result) {
    if (!err) {
      console.log("Reset password e-mail sent to: " + doc.id)
      reset_token(doc)
    } else {
      console.log(err)
    }
  });
}

function reset_token(doc) {
  resets.merge(doc.id, {email_sent:true}, function(err, res) {
    if (err)
      console.log(err)
  });
}

resets.view('tokens/unsent', function(err, doc) {
  if (!err) {
     for (i=0; i<doc.length; i++)
      send_email(doc[i])
  } else {
    console.log(err)
  }
});
