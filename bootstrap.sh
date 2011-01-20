#!/bin/bash
# Paste this in the userdata field while launching a new instance.

########################################
# Created by John Alberts
# Mofied by John Dyer
# Mofied by Chris Matthieu
# Last modified: 1/9/2011
# 
# Error Codes:
# 1 - Not running as root
# 2 - Invalid hostname
# 3 - Failed to get remove Ruby OS packages
# 4 - Failed to compile and install Ruby
#
# NOTES:
# This only works on CentOS 5. Only tested on x86_64
#
#########################################


RUBY_SOURCE_URL="ftp://ftp.ruby-lang.org/pub/ruby/1.8/ruby-1.8.7-p330.tar.gz"
# The below URL only works from within the exlibrisgroup network. Anyone else should use the URL above.

if ! ( whoami | grep root > /dev/null 2>&1); then
    echo "YOU MUST BE ROOT TO RUN THIS SCRIPT"'!'
    exit 1
fi

if ! ( ping -c1 -q `hostname -f` > /dev/null 2>&1 ); then
    echo "hostname -f must be a valid fqdn for Chef to work properly"'!'
    exit 2
fi

echo "Removing already installed Ruby OS packages..."
PKGLIST="$(yum list | grep installed | grep ruby | sed -n 's/\([^.]*\)\.\(x86_64\|i386\).*$/\1/p' | tr '\n' ' ')"
  if [[ $PKGLIST != "" ]]; then
    yum -y erase $PKGLIST
    RETVAL=$?
  else
      RETVAL=0
  fi

echo;echo
if [[ ${RETVAL} -ne 0 ]]; then
    echo "Failed to remove Ruby OS packages"'!'
    exit 3
fi

echo "Installing Ruby and dependencies..."
yum -y install gcc gcc-c++ zlib-devel openssl-devel readline-devel

mkdir /tmp/sources
cd /tmp/sources


# Get # cpu's to make this faster
CPUS="$(grep processor /proc/cpuinfo | wc -l)"

wget "${RUBY_SOURCE_URL}"
tar -xvzf $(basename ${RUBY_SOURCE_URL})
cd $(basename ${RUBY_SOURCE_URL/.tar.gz})
./configure
make -j $CPUS
make -j $CPUS install
RETVAL=$?

echo;echo

if [[ ${RETVAL} -ne 0 ]]; then
echo "RUBY INSTALLATION FAILED"'!'
exit 4
fi

echo 'gem: --no-ri --no-rdoc' > /root/.gemrc

sudo rpm -Uvh http://download.fedora.redhat.com/pub/epel/5/i386/epel-release-5-4.noarch.rpm


# yum install git-core
cd /tmp 
wget http://kernel.org/pub/software/scm/git/git-1.7.3.5.tar.bz2 
bzip2 -d git-1.7.3.5.tar.bz2 
tar xvf git-1.7.3.5.tar
cd git-* 
./configure
make prefix=/usr install
# make install 


# curl -O http://production.cf.rubygems.org/rubygems/rubygems-1.4.1.tgz
wget http://production.cf.rubygems.org/rubygems/rubygems-1.4.1.tgz
tar xfz rubygems-1.4.1.tgz
/usr/local/bin/ruby setup.rb

gem install chef ohai --no-rdoc --no-ri
mkdir /etc/chef
chown root:root /etc/chef

cd /tmp 
wget http://nodejs.org/dist/node-v0.3.4.tar.gz
tar -zxvf node-v0.3.4.tar.gz
cd node* 
./configure
make
make install 


echo "Installation completed."