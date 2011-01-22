#!/bin/bash
BASEDIR=${1};
USERDIR=${2};
APPDIR=${3};
START=${4};

cd ${USERDIR};
echo "/usr/bin/node ${BASEDIR}/deps/nodemon/nodemon ${USERDIR} ${APPDIR}/.app.pid ${APPDIR}/${START}";
exec /usr/bin/node ${BASEDIR}/deps/nodemon/nodemon ${USERDIR} ${APPDIR}/.app.pid ${APPDIR}/${START};
