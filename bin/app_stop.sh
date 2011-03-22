#!/bin/bash

cd `dirname $0`

./node-config.js
wait
source ./.nodester.config
rm ./.nodester.config

export HOME=$HOME_DIR;
export PATH="/usr/local/bin:${HOME}/bin:${PATH}";

APPDIR=$APP_DIR


FHOME=$HOME/forever-app

forever stopall -p $FHOME

sleep 1
