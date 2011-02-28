#!/bin/bash

export HOME=/var/nodester;
export PATH="/usr/local/bin:${PATH}";

APPDIR=$HOME/nodester


FHOME=$HOME/forever-app/

if [ ! -d $FHOME ]; then
    mkdir -p $FHOME/logs
    mkdir -p $FHOME/pids
fi

if [ -f $FHOME/logs/forever.log ]; then
    rm -rRf $FHOME/logs/forever.log
fi


wait
forever start -l logs/forever.log -o $FHOME/logs/app-out.log -e $FHOME/logs/app-err.log -d $APPDIR -p $FHOME app.js

