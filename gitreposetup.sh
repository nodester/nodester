#! /bin/bash
# script to create git repo for node subdomain 
# _rev is passed into the script as a parameter
mkdir apps
mkdir apps/$1.git
cd apps/$1.git
git init --bare
cp ../../gitrepoclone.sh hooks/post-receive
chmod +x hooks/post-receive

