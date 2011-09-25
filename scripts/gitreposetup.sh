#!/bin/bash
# script to create git repo for node subdomain 
# _rev is passed into the script as a parameter

BASEDIR=${1};
GITDIR=${2};
APPUSERNAME=${3};
REV=${4};
START=${5};
NODESTER_UID=${6};
APPDESCR=${7};
APPDIR=${8};

GIT_DIR=${GITDIR}/${APPUSERNAME}/${REV}.git
APP_DIR=${APPDIR}/${APPUSERNAME}/${REV}

mkdir -p ${GIT_DIR};
cd ${GIT_DIR};
git init --bare;
ln -s ${BASEDIR}/scripts/gitrepoclone.sh ${GIT_DIR}/hooks/post-receive;
echo $APPDESCR > description
#git clone ${GIT_DIR} ${APP_DIR}/;
