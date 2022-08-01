**[Home](README.md)** | [Tasks](tasks/README.md) | [Build/Deployment](build/README.md)

# RFCx Core API

## Introduction

The API can be run in "regular" or "mqtt" modes. It requires connections to MySQL and TimescaleDB (Postgres) databases. It also has dependencies on AWS (S3 and SNS/SQS), Auth0, Firebase, Mailchimp/Mandrill, Stripe and Classy.

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

### Env variables

Clone and copy `./common/config/env_vars.js.sample` into `./common/config/env_vars.js` and fill it with required vars.

### Run all the required support services

Install dependencies:

```
npm i
```

We can use docker-compose to setup local TimescaleDB.

Start containers:

```
docker compose up -d
```

Stop containers:

```
docker compose down
```

### Create the database tables

#### To run sync and migrations

For MySQL (noncore):

```
npm run migrate:noncore
```

For TimescaleDB (core):

```
npm run migrate:core
```

### Seed the database

#### MySQL

Complicated! There is bin/mysql/seed.sql which contains super-minimal content for running the API. It is unclear what extra data is required for the older v1 endpoints.

#### TimescaleDB

Install `psql`:

```
brew install postgresql
```

If you are using a local dev environment with docker compose then:

```
./core/_cli/seed.sh
```

Otherwise, specify your host/user/pass/etc as arguments:

```
./core/_cli/seed.sh USERNAME PASSWORD HOSTNAME PORT DATABASENAME
```

## Running the API locally

### HTTP API

To run the core API with auto-reload:

```
npm run dev:core
```

Similarly, for the non-core API (only v1/v2 endpoints, without core):

```
npm run dev:noncore
```

And to run the combined API:

```
npm run dev
```

Without live reload (how it runs in production):

```
npm start:core
npm start:noncore
npm start
```

### MQTT API

To start the MQTT client and API, open another terminal then:

```
npm run start:mqtt
```

## Testing

This project uses [Jest](https://jestjs.io) for testing and [ESLint](https://eslint.org) for linting. To run both:

```
npm test
```

### Unit &amp; integration tests

In general, unit tests should be saved alongside the code files that they apply to (e.g. for a module `xyz.js`, if there are tests then they will be stored in `xyz.unit.test.js`).

Run Jest on all tests: `npm run jest`

Run Jest on unit tests (any file named `*.unit.test.js`): `npm run jest unit`

Run Jest on integration tests (any file named `*.int.test.js`): `npm run jest int`

Run Jest on specific folder/file: `npm run jest routes/core/streams`

Run Jest on specific folder/file with local environments: `npx jest routes/core/streams`

### Linting

Run ESLint: `npm run lint`

Fix all fixable errors: `npm run lint:fix`

Recommend developers to setup ESLint in their IDE. For VS Code, settings are included in the workspace settings already and lint/format automatically when the the [ESLint extension](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) is installed.
