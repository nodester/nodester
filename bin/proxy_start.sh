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

export HOME=$MAIN_HOME_DIR;
export PATH="/usr/local/bin:${HOME}/bin:${PATH}";

FHOME=$HOME/forever-proxy/

if [ ! -d $HOME/var ]; then
    mkdir $HOME/var
fi

if [ ! -d $FHOME ]; then
    mkdir -p $FHOME/logs
    mkdir -p $FHOME/pids
fi

if [ -f $FHOME/logs/forever.log ]; then
    rm -rRf $FHOME/logs/forever.log
fi

ulimit -n 99999;
forever start -l logs/forever.log -o $FHOME/logs/proxy-out.log -e $FHOME/logs/proxy-err.log -d $MAIN_APP_DIR -p $FHOME $MAIN_APP_DIR/proxy/proxy.js
wait
forever list -p $FHOME $MAIN_APP_DIR/proxy/proxy.js
