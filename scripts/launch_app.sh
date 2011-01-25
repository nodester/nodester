#!/bin/bash
BASEDIR=${1};
USERDIR=${2};
APPDIR=${3};
START=${4};

if [ -f ${BASEDIR}/scripts/launch_chrooted_app.js ]; then
  exec /usr/bin/node ${BASEDIR}/scripts/launch_chrooted_app.js ${USERDIR}/${APPDIR} ${START};
else;
  exec /usr/local/bin/node ${BASEDIR}/deps/nodemon/nodemon ${USERDIR} ${APPDIR}/.app.pid ${APPDIR}/${START};
fi;
