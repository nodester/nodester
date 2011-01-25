#!/bin/bash
export HOME=${1};
APPDIR=${2};
export PATH="/usr/local/bin:${PATH}";
ulimit -n 99999;
cd ${APPDIR}/proxy;
exec ${APPDIR}/deps/nodemon/nodemon /var/run/nodester_proxy.pid ${APPDIR}/proxy/proxy.js
