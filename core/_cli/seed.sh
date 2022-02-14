#!/bin/bash

if ! [ -x "$(command -v psql)" ]; then
  echo 'Error: psql is not installed.' >&2
  exit 1
fi

username=$1
if [ -z "$username" ]; then username="postgres"; fi
password=$2
if [ -z "$password" ]; then password="test"; fi
hostname=$3
if [ -z "$hostname" ]; then hostname="127.0.0.1"; fi
port=$4
if [ -z "$port" ]; then port="5432"; fi
dbname=$5
if [ -z "$dbname" ]; then dbname="postgres"; fi

# Test the connection
connection="postgres://$username:$password@$hostname:$port/$dbname"
if ! psql $connection --command "SELECT 1" 1> /dev/null; then
  exit 1
fi

currentdir=$(dirname "$0")
for filename in $currentdir/seeds/*.sql; do
    [ -e "$filename" ] || continue
    echo "=== Seeding $filename ==="
    psql $connection -f $filename
done

echo '=== Done! ==='
