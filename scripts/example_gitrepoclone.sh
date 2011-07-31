#!/bin/bash
# post-commit hook to create git file directory for node subdomain 
SECRETKEY=PleaseRestartMyAppMKay
GITBASE=/git
APPSBASE=/app

OLD_PWD=$PWD
gitdirsuffix=${PWD##*/}
gitdir=${gitdirsuffix%.git}
GITBASELEN=${#GITBASE};
OLD_PWDLEN=${#OLD_PWD};
MY_LEN=$(( ${OLD_PWDLEN} - ${GITBASELEN} - 4 ));
appdir="${APPSBASE}${OLD_PWD:${GITBASELEN}:${MY_LEN}}";

if [ -d "${appdir}" ]; then
  echo "Syncing repo with chroot"
  cd ${appdir};
  unset GIT_DIR;
  git pull;
else
  echo "Fresh git clone into chroot"
  mkdir -p ${appdir};
  git clone . ${appdir};
  cd ${appdir};
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
curl "http://127.0.0.1:4001/app_restart?repo_id=${gitdir}&restart_key=${SECRETKEY}" 2>/dev/null
echo ""
echo "App restarted.."
echo ""
echo "  \m/ Nodester out \m/"
echo ""
exit 0;
