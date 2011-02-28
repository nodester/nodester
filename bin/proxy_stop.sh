#!/bin/bash

if [ "$USER" != "root" ]; then
    echo "Must be root to run this.. Please sudo this command."
    exit
fi

export HOME=/var/nodester;
export PATH="/usr/local/bin:${PATH}";

APPDIR=$HOME/nodester;


FHOME=$HOME/forever-proxy

forever stopall -p $FHOME
