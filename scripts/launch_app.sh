#!/bin/bash
# '/scripts/launch_app.sh ' + config.opt.basedir + ' ' + config.opt.username + ' ' + app_home + ' ' + app.start + ' ' + app.port + ' ' + '127.0.0.1' + ' ' + doc.appname;
BASEDIR="${1}";
USERN="${2}";
APPHOME="${3}";
APPSTART="${4}";
APPPORT="${5}";
APPHOST="${6}";
APPNAME="${7}";
export HOME=/var/nodester;
ID=$( id -u ${USERN} );
echo $ID;
node=`which node`
exec ${node} ${BASEDIR}/scripts/launch_chrooted_app.js ${ID} ${APPHOME} ${APPSTART} ${APPPORT} ${APPHOST} ${APPNAME};
