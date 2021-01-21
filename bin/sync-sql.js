console.log('----------------------------------\nRFCX | sync-sql started')
var exec = require('child_process').exec
var fs = require('fs')
var path = require('path')
var argv = require('minimist')(process.argv.slice(2))

// MySQL by default
var databaseType = argv && argv.type === 'timescale' ? 'timescale' : 'mysql'

// Explanation:
// 1. Load the environment variables from env_vars.js (if exists)
// 2. Write config.json (which is needed by migration command)
// 3. Run model sync (mysql only)
// 4. Run migrations

if (fs.existsSync(path.join(__dirname, '/../config/env_vars.js'))) {
  var env = require(path.join(__dirname, '/../config/env_vars.js')).env
  for (var i in env) { process.env[i] = env[i] }
}

console.log(`RFCX | Initializing sequelize for ${databaseType}`)
initializeSequelize()

function initializeSequelize () {
  const migrationsPath = databaseType === 'timescale' ? 'migrationsTimescale' : 'migrations'
  const modelsPath = databaseType === 'timescale' ? 'modelsTimescale' : 'models'
  const models = require('../' + modelsPath)

  console.log('RFCX | Creating config params: started')
  var configJsonFile = path.join(__dirname, '/../config/config.json')

  var sequelizeVerbose = (process.env.SEQUELIZE_VERBOSE != null) ? process.env.SEQUELIZE_VERBOSE : false

  const dbUsername = databaseType === 'timescale' ? process.env.POSTGRES_USER : process.env.DB_USERNAME
  const dbPassword = databaseType === 'timescale' ? process.env.POSTGRES_PASSWORD : process.env.DB_PASSWORD
  const dbName = databaseType === 'timescale' ? process.env.POSTGRES_DB : process.env.DB_NAME

  const config = {
    ...models.options,
    username: dbUsername,
    password: dbPassword,
    database: dbName,
    logging: sequelizeVerbose
  }
  const configJsonContent = JSON.stringify({ development: config, test: config, staging: config, production: config })
  console.log('RFCX | Creating config params: ended')

  // TODO: use promises to increase readability
  fs.unlink(configJsonFile, function (e) {
    fs.writeFile(configJsonFile, configJsonContent, function (e) {
      if (!e) {
        console.log('RFCX | sequelize config.json has been [re]generated')
      }

      function migrate () {
        return new Promise((resolve, reject) => {
          const command = `npx sequelize db:migrate --models-path ./${modelsPath} --migrations-path ./${migrationsPath}`
          exec(command, function (err, sOut, sErr) {
            console.log(sOut)
            if (err) { return reject(err) }
            if (sErr) { return reject(sErr) }
            return resolve()
          })
        })
      }

      if (databaseType === 'timescale') {
        // Apply migrations
        console.log('RFCX | Running Timescale migrations\n')
        migrate()
          .then(() => console.log('RFCX | Migrations complete\n'))
          .catch(err => console.error(err))
      } else {
        // We use the sync command to create new tables or new columns only.
        // Migrations are for altering/dropping tables or columns.
        console.log('RFCX | Syncing MySQL models\n')
        models.sequelize.sync({ logging: console.log })
          .then(() => console.log('RFCX | Running migrations\n'))
          .then(migrate)
          .then(() => console.log('RFCX | Syncing and migrations complete\n'))
          .catch(err => console.error(err))
      }
    })
  })
}
