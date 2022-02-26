console.info('CLI: Migrate started')
const exec = require('child_process').exec
const fs = require('fs')
const path = require('path')

// Explanation:
// 1. Load the environment variables from env_vars.js (if exists)
// 2. Write config.json (which is needed by migration command)
// 3. Run model sync
// 4. Run migrations

if (fs.existsSync(path.join(__dirname, '/../../common/config/env_vars.js'))) {
  const { env } = require(path.join(__dirname, '/../../common/config/env_vars.js'))
  for (const i in env) { process.env[i] = env[i] }
}

console.info('CLI: Initializing sequelize for NONCORE')
initializeSequelize()

function initializeSequelize () {
  const migrationsPath = 'noncore/_cli/migrations'
  const modelsPath = 'noncore/_models'
  const models = require('../../' + modelsPath)

  console.info('CLI: Creating config params: started')
  const configJsonFile = path.join(__dirname, '/../../.sequelize-config.json')

  const sequelizeVerbose = (process.env.SEQUELIZE_VERBOSE != null) ? process.env.SEQUELIZE_VERBOSE : false

  const config = {
    ...models.options,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
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

      // We use the sync command to create new tables only.
      // Migrations are for altering/dropping tables or columns.
      console.info('CLI: Syncing MySQL models\n')
      models.sequelize.sync({ logging: console.info })
        .then(() => console.info('CLI: Running migrations\n'))
        .then(migrate)
        .then(() => console.info('CLI: Syncing and migrations complete\n'))
        .catch(err => console.error(err))
        .finally(() => new Promise((resolve) => { fs.unlink(configJsonFile, resolve) }))
    })
  })
}
