rfcx-api
========

Rainforest Connection API (v2)

master
![](https://api.travis-ci.org/rfcx/rfcx-api.png?branch=master)

## MQTT API

To run a development MQTT broker locally, first generate the required certs:

```
cd bin/mosquitto
./generate_certs.sh
```

Then start the broker using docker (configuration for the broker is in `mosquitto.conf`):

```
./local_mqtt_broker.sh
```

To start the MQTT client and API, open another terminal then:

```
./bin/start_mqtt
```

*TODO: start_mqtt requires configuration -- explain*

