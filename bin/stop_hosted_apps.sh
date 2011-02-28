#!/bin/bash

cd `dirname $0`

./node-config.js
wait
source ./.nodester.config


node $APPDIR/scripts/start_hosted_apps.js stop "$@"
