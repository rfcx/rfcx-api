#!/usr/bin/env bash

source $(PWD)/bin/mongo/.env

docker run --rm --name rfcx-api-mongo -p 27017:27017 -v $MONGO_DB_FILES_PATH:/data/db \
  -e MONGO_INITDB_ROOT_USERNAME=$MONGO_USERNAME \
  -e MONGO_INITDB_ROOT_PASSWORD=$MONGO_PASSWORD \
  -d mongo:4.2.5
