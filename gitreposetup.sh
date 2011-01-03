#! /bin/bash
# script to create git repo for node subdomain 
# _rev is passed into the script as a parameter
mkdir $1.git
cd $1.git
git init --bare

