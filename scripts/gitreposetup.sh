#! /bin/bash
# script to create git repo for node subdomain 
# _rev is passed into the script as a parameter

BASEDIR=${1};
APPDIR=${2};
APPUSERNAME=${3};
REV=${4};
START=${5};
#This was UID which is a readonly variable.. Duh..
NODESTER_UID=${6};
GIT_UID=${6};

if [ ! -d "${APPDIR}" ]; then
  mkdir -p ${APPDIR};
fi;

mkdir -p ${APPDIR}/${APPUSERNAME}/${REV}.git;
cd ${APPDIR}/${APPUSERNAME}/${REV}.git;
git init --bare;
cp ${BASEDIR}/scripts/gitrepoclone.sh hooks/post-receive;
chmod +x hooks/post-receive;

git clone . ../${REV}/;
wait

cd ../
echo "Changing Perms"
echo "$PWD"
echo "chown -R $NODESTER_UID ${REV}*"
chown -R $NODESTER_UID:$NODESTER_UID ${REV}
chown -R $GIT_UID:$NODESTER_UID ${REV}.git
