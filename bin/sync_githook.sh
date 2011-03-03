#!/bin/bash

cd `dirname $0`

./node-config.js
wait
source ./.nodester.config

export HOME=$HOME_DIR;
export PATH="/usr/local/bin:${PATH}";

$APP_DIR/scripts/sync_githook.js

