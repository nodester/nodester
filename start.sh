#!/bin/bash

APPPATH=`pwd`;

# SCREEN=nodester
# screen -dmS ${SCREEN};
# sleep 2;
# screen -S ${SCREEN} -p 0 -X screen
# screen -S ${SCREEN} -p 0 -X stuff "sudo ${APPPATH}/proxy/start_proxy.sh ${HOME} ${APPPATH}
";
# screen -S ${SCREEN} -p 1 -X stuff "cd ${APPPATH}; ${APPPATH}/deps/nodemon/nodemon ${APPPATH}/.app.pid ${APPPATH}/app.js
";

# Now that the processes are detached screen makes no sense!
sudo ${APPPATH}/proxy/start_proxy.sh ${HOME} ${APPPATH}
${APPPATH}/deps/nodemon/nodemon ${APPPATH}/.app.pid ${APPPATH}/app.js
node ${APPPATH}/scripts/start_hosted_apps.js
