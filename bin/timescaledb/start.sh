#!/usr/bin/env bash

source $(PWD)/bin/timescaledb/.env

docker run -d --name rfcx-api-timescaledb -p $POSTGRES_PORT:5432 -v $TIMESCALE_DB_FILES_PATH:/var/lib/postgresql/data \
  -e POSTGRES_USER=$POSTGRES_USER \
  -e POSTGRES_PASSWORD=$POSTGRES_PASSWORD \
  timescale/timescaledb:latest-pg12
