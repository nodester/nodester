#! /bin/bash
# post-commit hook to create git file directory for node subdomain 
# cd ..
gitdirsuffix=${PWD##*/}
gitdir=${gitdirsuffix%.git}

if [ -d "../$gitdir" ]
then

cd ../$gitdir

unset GIT_DIR
git pull 
exec git-update-server-info

fi

if [ ! -d "../$gitdir" ]
then

git clone . ../$gitdir/

fi
