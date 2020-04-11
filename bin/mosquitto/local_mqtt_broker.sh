#!/usr/bin/env bash

docker run --rm -it -p 1883:1883 -p 8883:8883 -p 9001:9001 -v $(PWD)/mosquitto.conf:/mosquitto/config/mosquitto.conf -v $(PWD)/certs:/etc/mosquitto/certs eclipse-mosquitto:1.6.9