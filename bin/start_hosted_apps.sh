#!/bin/bash

cd `dirname $0`

./node-config.js
wait
source ./.nodester.config

node $MAIN_APP_DIR/scripts/start_hosted_apps.js start "$@"
