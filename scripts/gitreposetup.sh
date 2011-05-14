#! /bin/bash
# script to create git repo for node subdomain 
# _rev is passed into the script as a parameter

BASEDIR=${1};
APPDIR=${2};
APPUSERNAME=${3};
REV=${4};
START=${5};

if [ ! -d "${APPDIR}" ]; then
  mkdir -p ${APPDIR};
fi;

mkdir -p ${APPDIR}/${APPUSERNAME}/${REV}.git;
cd ${APPDIR}/${APPUSERNAME}/${REV}.git;
git init --bare;
ln -s ${BASEDIR}/scripts/gitrepoclone.sh hooks/post-receive;
#chmod +x hooks/post-receive;

#git clone . ../${REV}/;
