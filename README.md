rfcx-api
========

Rainforest Connection API (v2)

master
![](https://api.travis-ci.org/rfcx/rfcx-api.png?branch=master)

## Project configuration for local development

### Node version
Nodejs 6.10.0 is required to run the app. If you use [nvm](https://github.com/nvm-sh/nvm), you can run the following commands in the project root:
If node v6.10.0 is not yet installed on your machine:
```
nvm install
```
When node v6.10.0 is installed on your machine:
```
nvm use
```

### Depencencies
Sometimes node modules may dissappear from remote storage. That's why we keep them in `node_modules` in our repo. You **shouldn't** run `npm install` on your machine. All required deps are already here.

### Env variables
Clone and copy `./config/env_vars.js.sample` into `./config/env_vars.js` and fill it with required vars

### VPN
You need to be connected to rfcx-ldap VPN to have access to databases.


## HTTP API
To start http API run the following command in the project root:
```
npm start
```

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
npm run start.mqtt
```

