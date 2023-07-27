**[Home](README.md)** | [Tasks](tasks/README.md) | [Build/Deployment](build/README.md)

# RFCx Core API

## Introduction

The reposititory consists of several services sharing a common base: Core API, Core Tasks, Noncore API (Guardian-specific), MQTT (Guardian-specific). All the services require a Timescale database (based on Postgres). Some services also dependend on AWS (S3 and SNS/SQS), Auth0, Firebase, Mailchimp/Mandrill, Stripe and Classy.

## Quick start (Core API)

Requirements: Node 16, Docker, psql

1. Install dependencies `npm i`

2. Copy config file `cp common/config/env_vars.js.sample common/config/env_vars.js`

3. Start the db, run migrations and seeds `npm run serve-db:core`

4. Run the Core API in local dev mode `npm run dev:core`

5. Navigate to the API docs http://localhost:8080/docs/

6. Start the test db `npm run serve-db:test`

7. Make sure your tests are passing `npm run test`


## Project configuration for local development

### Node version

Required Nodejs version is specified in `.nvmrc` file. You can use [nvm](https://github.com/nvm-sh/nvm) to install/select the correct node version.

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

We can use docker-compose to run a local Timescale database and other services. You can use `docker compose up -d` or `docker compose down`, or simply:

```
npm run serve:core
```

Or for noncore:

```
npm run serve:noncore
```

For some users that have a local database driver installed on port 5432, the command up top might not work because it's trying to access your local database. Please change your local database port before trying to run the command again.

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

Requires `psql` (on Mac with brew, use `brew install libpq` and follow steps to add to your path).

If you are using a local dev environment with docker compose then:

```
./common/_cli/seed.sh
```

Otherwise, specify your host/user/pass/etc as arguments:

```
./common/_cli/seed.sh USERNAME PASSWORD HOSTNAME PORT DATABASENAME
```

For some users that are on Windows, your seed command might fail because of Windows's line endings (`CRLF`). So you have to convert the line endings from `CRLF` to `LF` first to be able to run the command. You can fire up WSL and use `tr`

```
tr -d "\r" < file
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

Without live reload (how it runs in production):

```
npm start:core
npm start:noncore
```

### MQTT API

To start the MQTT client and API, open another terminal then:

```
npm run start:mqtt
```

## Testing

This project uses [Jest](https://jestjs.io) for testing and [ESLint](https://eslint.org) for linting.

### Linting

Run ESLint:

```
npm run lint
```

Fix all fixable errors:

```
npm run lint-fix
```

Recommend developers to setup ESLint in their IDE. For VS Code, settings are included in the workspace settings already and lint/format automatically when the the [ESLint extension](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) is installed.

### Unit tests

Unit tests don't require a database. They typically test the logic of a function or module on its own. Mark a test as a unit test by naming it `*.unit.test.js`.

In general, unit tests should be saved alongside the code files that they apply to (e.g. for a module `xyz.js`, if there are tests then they will be stored in `xyz.unit.test.js`).

Run all unit tests:

```
npm run test:unit
```

Run a specific test suite (matching a pattern, e.g. any file containing `array` in the file path):

```
npm run test:unit array
```

When targeting a specific test suite, to run a single test case you can temporarily add `.only` to the case:

```js
test.only('can camelize', () => { ... })
```

### Integration tests

The goal of integration tests is to test a set of components (functions, modules) working together. Integration tests often require a database (but it is not a requirement).

To run all the integration tests, you will need to have a test database running. It's recommended to use a separate database from your development database because data will be dropped from the tables when running tests.

To start a test database (requires Docker to be running):

```
npm run serve-db:test
```

Run all the integration tests:

```
npm run test:int
```

Similar to unit tests, you can run individual test suites (matching a pattern):

```
npm run test:int classifier-jobs/dequeue
```

If you want to run unit and integration tests together then:

```
npm test
```
