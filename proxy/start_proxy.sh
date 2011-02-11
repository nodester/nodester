#!/bin/bash
export HOME=${1};
APPDIR=${2};
export PATH="/usr/local/bin:${PATH}";
ulimit -n 99999;
cd ${APPDIR}/proxy;
exec ${HOME}/bin/nodemon ${APPDIR}/proxy/proxy.js
