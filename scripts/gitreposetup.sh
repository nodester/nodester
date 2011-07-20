#!/bin/bash
# script to create git repo for node subdomain 
# _rev is passed into the script as a parameter

BASEDIR=${1};
APPDIR=${2};
APPUSERNAME=${3};
REV=${4};
START=${5};
NODESTER_UID=${6};
GIT_UID=${7};
APPS_DIR=${8};

GIT_DIR=${APPDIR}/${APPUSERNAME}/${REV}.git
APP_DIR=${APPS_DIR}/${APPUSERNAME}/${REV}

if [ ! -d "${APPDIR}" ]; then
  mkdir -p ${APPDIR};
fi;

mkdir -p ${GIT_DIR} ${APP_DIR};
git init --bare ${GIT_DIR};
#ln -s ${BASEDIR}/scripts/gitrepoclone.sh ${GIT_DIR}/hooks/post-receive;
cp ${BASEDIR}/scripts/gitrepoclone.sh ${GIT_DIR}/hooks/post-receive;

git clone ${GIT_DIR} ${APP_DIR}/;
wait

echo "Changing Perms"
echo "chown -R $GIT_UID:$NODESTER_UID ${GIT_DIR} ${APP_DIR}";
chown -R $GIT_UID:$NODESTER_UID ${GIT_DIR} ${APP_DIR};
echo "find ${GIT_DIR} ${APP_DIR} -type d -exec chmod 775 {} \;";
find ${GIT_DIR} ${APP_DIR} -type d -exec chmod 775 {} \;
echo "find ${GIT_DIR} ${APP_DIR} -type f -exec chmod 664 {} \;";
find ${GIT_DIR} ${APP_DIR} -type f -exec chmod 664 {} \;
echo "chmod +x ${GIT_DIR}/hooks/post-receive;";
chmod +x ${GIT_DIR}/hooks/post-receive;