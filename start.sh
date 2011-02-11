#!/bin/bash

APPPATH=`pwd`;

sudo ${APPPATH}/proxy/start_proxy.sh ${HOME} ${APPPATH}
nodemon ${APPPATH}/app.js
node ${APPPATH}/scripts/start_hosted_apps.js
