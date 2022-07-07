#!/bin/bash

# cli arguments:
#   -u username
#   -p password
#   -h hostname
#   -o port
#   -d dbname
#   -f folder (core or noncore)

if ! [ -x "$(command -v psql)" ]; then
  echo 'Error: psql is not installed.' >&2
  exit 1
fi

while getopts "u:p:h:o:d:f:" opt
do
  case "${opt}" in
    u ) username=${OPTARG} ;;
    p ) password=${OPTARG} ;;
    h ) hostname=${OPTARG} ;;
    o ) port=${OPTARG} ;;
    d ) dbname=${OPTARG} ;;
    f ) folder=${OPTARG} ;;
  esac
done

if [ -z "$username" ]; then username="postgres"; fi
if [ -z "$password" ]; then password="test"; fi
if [ -z "$hostname" ]; then hostname="127.0.0.1"; fi
if [ -z "$port" ]; then port="5432"; fi
if [ -z "$dbname" ]; then dbname="core"; fi
if [ -z "$folder" ]; then folder="core"; fi

# Test the connection
connection="postgres://$username:$password@$hostname:$port/$dbname"
if ! psql $connection --command "SELECT 1" 1> /dev/null; then
  exit 1
fi

currentdir=$(dirname "$0")
for filename in $currentdir/../../$folder/_cli/seeds/*.sql; do
  [ -e "$filename" ] || continue
  echo "=== Seeding $filename ==="
  psql $connection -f $filename
done

echo '=== Done! ==='
