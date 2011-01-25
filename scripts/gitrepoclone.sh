#! /bin/bash
# post-commit hook to create git file directory for node subdomain 
# cd ..
gitdirsuffix=${PWD##*/}
gitdir=${gitdirsuffix%.git}

if [ -d "../$gitdir" ]; then
  cd ../$gitdir;
  unset GIT_DIR;
  git pull;
  exec git-update-server-info;
fi;

if [ ! -d "../$gitdir" ]; then
  git clone . ../$gitdir/;
fi;

# kill and restart the app
cd ../$gitdir/;
P=`cat .app.pid`;
kill ${P};
sleep 1;
curl "http://127.0.0.1:4001/app_restart?repo_id=${gitdir}&restart_key=KeepThisSecret" >/dev/null 2>&1