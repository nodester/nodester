#!/bin/bash

if [ "$USER" != "root" ]; then
    echo "Must be root to run this.. Please sudo this command."
    exit
fi


export HOME=/var/nodester;
export PATH="/usr/local/bin:${PATH}";

APPDIR=$HOME/nodester/proxy


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
echo "forever start -l forever.log -o app-out.log -e app-err.log -d $APPDIR -p $FHOME proxy.js"
forever start -l logs/forever.log -o $FHOME/logs/proxy-out.log -e $FHOME/logs/proxy-err.log -d $APPDIR -p $FHOME proxy.js
