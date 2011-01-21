#!/bin/bash
BASEDIR=${1};
APPDIR=${2};
START=${3};

cd ${APPDIR};
echo "/usr/bin/node ${BASEDIR}/deps/nodemon/nodemon ${APPDIR}/.app.pid ${APPDIR}/${START}";
exec /usr/bin/node ${BASEDIR}/deps/nodemon/nodemon ${APPDIR}/.app.pid ${APPDIR}/${START};
