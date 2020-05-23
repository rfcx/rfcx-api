rfcx-api
========

Rainforest Connection API (v2)

master
![](https://api.travis-ci.org/rfcx/rfcx-api.png?branch=master)

## Project configuration for local development

### Node version
Required Nodejs version is specified in `.nvmrc` file. If you use [nvm](https://github.com/nvm-sh/nvm), you can run the following commands in the project's root:
If required node version is not yet installed on your machine:
```
nvm install
```
If required node version is installed on your machine:
```
nvm use
```

### Depencencies
Sometimes node modules may dissappear from remote storage. That's why we keep them in `node_modules` in our repo. You **shouldn't** run `npm install` on your machine. All required deps are already here.

### Env variables
Clone and copy `./config/env_vars.js.sample` into `./config/env_vars.js` and fill it with required vars

### VPN
You need to be connected to rfcx-ldap VPN to have access to databases.

### TimescaleDb
You can run TimescaleDb Docker container locally.
Clone and copy `./bin/timescaledb/.env.example` into `./bin/timescaledb/.env` and fill it with required vars.

Create Docker volume for TimescaleDb:
```
docker volume create pgdata
```

To start TimescaleDb container run the following command in the project root:
```
./bin/timescaledb/start.sh
```

To stop TimescaleDb container run the following command:
```
docker stop rfcx-api-timescaledb
```

You can use [pgAdmin](https://www.pgadmin.org/download/)  GUI Client to view your database.

### Models sync and running migrations for MySQL or TimescaleDb

#### To create new table
To create new table in MySQL or Timescale database create the only thing you will need is to create new model file in `models/` or `modelsTimescale/` respectively.
If you need to add any associations to another tables, put them into `defineRelationships` function in `models/index` or `modelsTimescale/` respectively.

#### To update existing table
To update/delete existing table you will need to create migration file in `migrations/` or `migrationsTimescale` respectively.
For MySQL:
```
npx sequelize migration:create --migrations-path ./migrations --name this-is-example-of-name
```
For TimescaleDb:
```
npx sequelize migration:create --migrations-path ./migrationsTimescale --name this-is-example-of-name
```

#### To run sync and migrations
For MySQL:
```
./bin/sync_sql --type mysql
```
For TimescaleDb:
```
./bin/sync_sql --type timescale
```

Note: you may need to create an empty `migrations` folder (or `migrationsTimescale` folder).

# Running the API locally
## HTTP API
To start http API run the following command in the project root:
```
npm start
```

To run the API with auto-reload (requires nodemon  `npm i nodemon -g`):
```
nodemon bin/start
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

