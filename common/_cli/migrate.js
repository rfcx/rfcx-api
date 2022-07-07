const cliArgs = process.argv.slice(2)
const type = cliArgs[0] || 'core'

if (type !== 'core' && type !== 'noncore') {
  console.error('Type argument must be "core" or "noncore"')
  process.exit(1)
}
// TODO Avoid writing config files by switching umzug (see bio and device api for examples)

console.info('CLI: Migrate started')
const exec = require('child_process').exec
const fs = require('fs')
const path = require('path')

// Explanation:
// 1. Load the environment variables from env_vars.js (if exists)
// 2. Write config.json (which is currently! needed by migration command)
// 3. Run migrations

if (fs.existsSync(path.join(__dirname, '/../config/env_vars.js'))) {
  const { env } = require(path.join(__dirname, '/../config/env_vars.js'))
  for (const i in env) { process.env[i] = env[i] }
}

console.info(`CLI: Initializing sequelize for ${type}`)
initializeSequelize()

function initializeSequelize () {
  const migrationsPath = `${type}/_cli/migrations`
  const modelsPath = `${type}/_models`
  const models = require('../../' + modelsPath)

  console.info('CLI: Creating config params: started')
  const configJsonFile = path.join(__dirname, '/../../.sequelize-config.json')

  const sequelizeVerbose = (process.env.SEQUELIZE_VERBOSE != null) ? process.env.SEQUELIZE_VERBOSE : false

  const config = {
    ...models.options,
    username: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: type === 'core' ? process.env.CORE_DB_NAME : process.env.NONCORE_DB_NAME,
    logging: sequelizeVerbose
  }
  const configJsonContent = JSON.stringify({ development: config, test: config, staging: config, production: config })
  console.info('CLI: Creating config params: ended')

  // TODO: use promises to increase readability
  fs.unlink(configJsonFile, function (e) {
    fs.writeFile(configJsonFile, configJsonContent, function (e) {
      if (!e) {
        console.info('CLI: sequelize config.json has been [re]generated')
      }

      function migrate () {
        return new Promise((resolve, reject) => {
          const command = `npx sequelize db:migrate --models-path ./${modelsPath} --migrations-path ./${migrationsPath} --config ${configJsonFile}`
          exec(command, function (err, sOut, sErr) {
            console.info(sOut)
            if (err) { return reject(err) }
            if (sErr) { return reject(sErr) }
            return resolve()
          })
        })
      }

      console.info('CLI: Migrations started\n')
      migrate().then(() => console.info('CLI: Migrations complete\n'))
        .catch(err => console.error(err))
        .finally(() => new Promise((resolve) => { fs.unlink(configJsonFile, resolve) }))
    })
  })
}
