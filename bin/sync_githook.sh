#!/bin/bash

cd `dirname $0`

./node-config.js
wait
source ./.nodester.config

export HOME=$MAIN_HOME_DIR;
export PATH="/usr/local/bin:${PATH}";

$MAIN_APP_DIR/scripts/sync_githook.js

