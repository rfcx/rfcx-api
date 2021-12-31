console.log('----------------------------------\nRFCX | setup started')
const path = require('path')
const fs = require('fs')

if (fs.existsSync(path.join(__dirname, '/../config/env_vars.js'))) {
  const env = require(path.join(__dirname, '/../config/env_vars.js')).env
  for (const i in env) { process.env[i] = env[i] }
}

// run the setup script(s)
console.log('RFCX | Setting up tmp directory')
setupTmpDirectory()
console.log('RFCX | Initializing sequelize')
initializeSequelize()

function initializeSequelize () {
  console.log('RFCX | Creating config params: started')
  const configJsonFile = path.join(__dirname, '/../config/config.json')

  const sequelizeVerbose = (process.env.SEQUELIZE_VERBOSE != null) ? process.env.SEQUELIZE_VERBOSE : false

  const configCustom = '"username": "' + process.env.DB_USERNAME + '", "password": "' + process.env.DB_PASSWORD + '", "database": "' + process.env.DB_NAME + '", "host": "' + process.env.DB_HOSTNAME + '"'
  const configGeneric = '"dialect": "mysql", "logging": ' + sequelizeVerbose + ', "define": { "underscored": true, "charset": "utf8", "collate": "utf8_general_ci", "timestamps": true }'

  const configJsonContent = '{ ' +
    '\n"development": { ' + configCustom + ', ' + configGeneric + ' }, ' +
    '\n"test": { ' + configCustom + ', ' + configGeneric + ' }, ' +
    '\n"staging": { ' + configCustom + ', ' + configGeneric + ' }, ' +
    '\n"production": { ' + configCustom + ', ' + configGeneric + ' } ' +
  '\n}'

  console.log('RFCX | Creating config params: ended')

  fs.unlink(configJsonFile, function (e) {
    fs.writeFile(configJsonFile, configJsonContent, function (e) {
      if (!e) {
        console.log('RFCX | sequelize config.json has been [re]generated')
      }
    })
  })
}

function setupTmpDirectory () {
  const tmpDir = process.env.CACHE_DIRECTORY
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir)
  }
  ['uploads', 'test-assets', 'faux-knox', 'ffmpeg', 'zip'].forEach((name) => {
    try {
      const dirName = path.join(tmpDir, name)
      if (fs.existsSync(dirName)) {
        const dir = fs.readdirSync(dirName)
        dir.forEach((child) => {
          fs.unlinkSync(path.join(dirName, child))
        })
      } else {
        fs.mkdirSync(dirName)
      }
    } catch (err) {
      console.error(err)
    }
  })
}
