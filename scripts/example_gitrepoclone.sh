#!/bin/bash
# post-commit hook to create git file directory for node subdomain 
SECRETKEY=PleaseRestartMyAppMKay
GITBASE=/git
APPSBASE=/app

OLD_PWD=$PWD
gitdirsuffix=${PWD##*/}
gitdir=${gitdirsuffix%.git}
GITBASELEN=${#GITBASE};

appdir="${APPSBASE}${OLD_PWD:${GITBASELEN}}";

if [ -d "${appdir}" ]; then
  echo "Syncing repo with chroot"
  cd ${appdir};
  unset GIT_DIR;
  git pull;
else
  echo "Fresh git clone into chroot"
  git clone . ${appdir};
  cd ${appdir};
fi

find . -type d -exec chmod 777 {} \;
find . -type f -exec chmod 666 {} \;

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
