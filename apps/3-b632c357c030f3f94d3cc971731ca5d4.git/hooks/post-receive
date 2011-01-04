#! /bin/bash
# post-commit hook to create git file directory for node subdomain 
# cd ..
gitdirsuffix=${PWD##*/}
gitdir=${gitdirsuffix%.git}
git clone . ../$gitdir/

#nodemon startfile.js


