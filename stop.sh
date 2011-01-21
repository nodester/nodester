#!/bin/bash

kill `cat ./.app.pid`;
kill `cat ./.app.pid.2`;
sudo `pwd`/proxy/stop.sh;
