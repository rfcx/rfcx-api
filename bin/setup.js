console.log('----------------------------------\nRFCX | setup started')
var path = require('path')
var fs = require('fs')

if (fs.existsSync(path.join(__dirname, '/../config/env_vars.js'))) {
  var env = require(path.join(__dirname, '/../config/env_vars.js')).env
  for (var i in env) { process.env[i] = env[i] }
}

// run the setup script(s)
console.log('RFCX | Setting up tmp directory')
setupTmpDirectory()
console.log('RFCX | Initializing sequelize')
initializeSequelize()

function initializeSequelize () {
  console.log('RFCX | Creating config params: started')
  var configJsonFile = path.join(__dirname, '/../config/config.json')

  var sequelizeVerbose = (process.env.SEQUELIZE_VERBOSE != null) ? process.env.SEQUELIZE_VERBOSE : false

  var configCustom = '"username": "' + process.env.DB_USERNAME + '", "password": "' + process.env.DB_PASSWORD + '", "database": "' + process.env.DB_NAME + '", "host": "' + process.env.DB_HOSTNAME + '"'
  var configGeneric = '"dialect": "mysql", "logging": ' + sequelizeVerbose + ', "define": { "underscored": true, "charset": "utf8", "collate": "utf8_general_ci", "timestamps": true }'

  var configJsonContent = '{ ' +
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
        // console.log('RFCX | Getting models')
        // var models = require("../models");

        // /* sequelize sync */
        // console.log('RFCX | Syncing models\n');
        // models.sequelize.sync({
        //   logging: console.log
        // })
        //   .then(function() {
        //     console.log('\nRFCX | Models have been synced')
        //     /* run sequelize-cli migrations from command line */
        //     var seqCliPath = process.cwd()+'/node_modules/sequelize-cli/bin/sequelize';
        //     console.log('RFCX | Migrating db: started')
        //     require('child_process').exec(seqCliPath+' db:migrate:old_schema; '+seqCliPath+' db:migrate;',function(err,sOut,sErr){
        //       console.log('RFCX | Migrating db: ended')
        //       console.log(sErr);
        //     });
        //   })
        //   .catch(function(err) {
        //     console.log('RFCX | Error in syncing models:', err);
        //   });
      }
    })
  })
}

function setupTmpDirectory () {
  var tmpDir = process.env.CACHE_DIRECTORY
  if (!fs.existsSync(tmpDir)) { fs.mkdirSync(tmpDir) }

  try {
    if (fs.existsSync(tmpDir + '/uploads')) {
      fs.readdir(tmpDir + '/uploads', function (err, dirName) {
        dirName.forEach(function (innerFileName) {
          fs.unlink(tmpDir + '/uploads/' + innerFileName, function (err) { if (err) console.log(err) })
        })
      })
    } else { fs.mkdirSync(tmpDir + '/uploads') }
  } catch (err) {
    console.error(err)
  }

  try {
    if (fs.existsSync(tmpDir + '/test-assets')) {
      fs.readdir(tmpDir + '/test-assets', function (err, dirName) {
        dirName.forEach(function (innerFileName) {
          fs.unlink(tmpDir + '/test-assets/' + innerFileName, function (err) { if (err) console.log(err) })
        })
      })
    } else { fs.mkdirSync(tmpDir + '/test-assets') }
  } catch (err) {
    console.error(err)
  }

  try {
    if (fs.existsSync(tmpDir + '/faux-knox')) {
      fs.readdir(tmpDir + '/faux-knox/', function (err, dirName) {
        dirName.forEach(function (innerFileName) {
          fs.unlink(tmpDir + '/faux-knox/' + innerFileName, function (err) { if (err) console.log(err) })
        })
      })
    } else { fs.mkdirSync(tmpDir + '/faux-knox') }
  } catch (err) {
    console.error(err)
  }

  try {
    if (fs.existsSync(tmpDir + '/ffmpeg')) {
      fs.readdir(tmpDir + '/ffmpeg/', function (err, dirName) {
        dirName.forEach(function (innerFileName) {
          fs.unlink(tmpDir + '/ffmpeg/' + innerFileName, function (err) { if (err) console.log(err) })
        })
      })
    } else { fs.mkdirSync(tmpDir + '/ffmpeg') }
  } catch (err) {
    console.error(err)
  }

  try {
    if (fs.existsSync(tmpDir + '/faux-knox')) {
      fs.readdir(tmpDir + '/faux-knox/', function (err, dirName) {
        dirName.forEach(function (innerFileName) {
          fs.unlink(tmpDir + '/faux-knox/' + innerFileName, function (err) { if (err) console.log(err) })
        })
      })
    } else { fs.mkdirSync(tmpDir + '/faux-knox') }
  } catch (err) {
    console.error(err)
  }

  try {
    if (fs.existsSync(tmpDir + '/zip')) {
      fs.readdir(tmpDir + '/zip/', function (err, dirName) {
        dirName.forEach(function (innerFileName) {
          fs.unlink(tmpDir + '/zip/' + innerFileName, function (err) { if (err) console.log(err) })
        })
      })
    } else { fs.mkdirSync(tmpDir + '/zip') }
  } catch (err) {
    console.error(err)
  }
}
