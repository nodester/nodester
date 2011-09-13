#!/usr/bin/env node

var mailer = require('nodemailer'),
  lib = require('../lib/lib'),
  config = require('../config');

var resets = lib.get_couchdb_database('password_resets');

mailer.SES = config.opt.SES;

function send_email(doc) {
  mailer.send_mail({
    sender: '<notifier@nodester.com>',
    to: doc.id,
    subject: 'Password reset request',
    body: 'Here is your password request token: ' + doc.value.token + '\n\nYou can reset your password via Nodester API or CLI'
  }, function (error, success) {
    console.log('Reset password e-mail sent to: ' + doc.id)
    console.log('Message ' + success ? 'sent' : 'failed');
    reset_token(doc)
  });
}

function reset_token(doc) {
  resets.merge(doc.id, {
    email_sent: true
  }, function (err, res) {
    if (err) console.log(err)
  });
}

resets.view('tokens/unsent', function (err, doc) {
  if (!err) {
    for (i = 0; i < doc.length; i++)
    send_email(doc[i])
  } else {
    console.log(err)
  }
});
