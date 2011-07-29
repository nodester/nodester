#!/bin/bash

if [ "$USER" != "root" ]; then
    echo "Must be root to run this.. Please sudo this command."
    exit
fi

cd `dirname $0`

./node-config.js
wait
source ./.nodester.config
rm ./.nodester.config

export HOME=$MAIN_HOME_DIR;
export PATH="/usr/local/bin:${HOME}/bin:${PATH}";

APPDIR=$MAIN_APP_DIR


FHOME=$HOME/forever-app

forever stopall -p $FHOME

sleep 1
