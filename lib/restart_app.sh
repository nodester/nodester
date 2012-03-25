#!/bin/bash

sudo su nodester
export OLDAPP=$APP
export APP=$0;
echo "require('./app').restart_by_name(${APP},function(){console.log(arguments);})" | node
export APP=$OLDAPP
