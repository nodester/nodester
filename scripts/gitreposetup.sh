#! /bin/bash
# script to create git repo for node subdomain 
# _rev is passed into the script as a parameter

if [ ! -d "apps" ]
then
mkdir apps
fi

mkdir apps/$1.git
cd apps/$1.git
git init --bare
cp ../../gitrepoclone.sh hooks/post-receive
chmod +x hooks/post-receive

git clone . ../$1/
cd ../$1

nodemon $2

