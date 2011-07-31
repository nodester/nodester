#!/bin/bash

if [ "$USER" != "root" ]; then
    echo "Must be root to run this.. Please sudo this command."
    exit
fi

cd `dirname $0`

./node-config.js
wait
source ./.nodester.config
wait
rm ./.nodester.config

export HOME=$HOME_DIR;
export PATH="/usr/local/bin:${HOME}/bin:${PATH}";

APPDIR=$APP_DIR

FHOME=$HOME/forever-proxy

forever stopall -p $FHOME

sleep 1
