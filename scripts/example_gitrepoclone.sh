#!/bin/bash
# post-commit hook to create git file directory for node subdomain 
SECRETKEY=PleaseRestartMyAppMKay
OLD_PWD=$PWD
gitdirsuffix=${PWD##*/}
gitdir=${gitdirsuffix%.git}

if [ -d "../$gitdir" ]; then
  echo "Syncing repo with chroot"
  cd ../$gitdir;
  unset GIT_DIR;
  git pull;
else
  echo "Fresh git clone into chroot"
  git clone . ../$gitdir/;
  cd ../$gitdir;
fi

hook=./.git/hooks/post-receive
if [ -f "$hook" ]; then
    rm $hook
fi

if [ -f ./.gitmodules ]; then
    echo "Found git submodules, updating them now..."
    git submodule init;
    git submodule update;
fi

cd $OLD_PWD

echo "Attempting to restart your app: ${gitdir}"
curl "http://127.0.0.1:4001/app_restart?repo_id=${gitdir}&restart_key=${SECRETKEY}" >/dev/null 2>&1 &
echo "App restarted.."
echo ""
echo "  \m/ Nodester out \m/"
echo ""
exit 0;
