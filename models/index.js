'use strict'

const fs = require('fs')
const path = require('path')
const Sequelize = require('sequelize')
const defineRelationships = require('./relationships')
const env = process.env.NODE_ENV || 'development'

const options = env === 'test'
  ? {
      dialect: 'sqlite'
    }
  : {
      dialect: 'mysql',
      host: process.env.DB_HOSTNAME,
      port: process.env.DB_PORT,
      logging: false,
      define: {
        underscored: true,
        timestamps: true,
        charset: 'utf8',
        dialectOptions: {
          collate: 'utf8_general_ci'
        }
      },
      hooks: {
        afterConnect: () => {
          console.log('Connected to MySQL')
        },
        afterDisconnect: () => {
          console.log('Disonnected from MySQL')
        }
      }
    }
if (env === 'development') {
  options.logging = function (str) {
    console.log('\nSQL QUERY----------------------------------\n', str, '\n----------------------------------')
  }
}

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USERNAME, process.env.DB_PASSWORD, options)
const db = {}

sequelize.authenticate() // check connection

// get file listing in 'models' directory, filtered by those we know to ignore...
fs.readdirSync(__dirname).filter(function (file) {
  return (file.indexOf('.') !== 0) && (file !== 'index.js') && (file !== 'relationships.js') && !fs.statSync(path.join(__dirname, file)).isDirectory()
}).forEach(function (file) { importSequelizeModelFile(file) })

// get file listings from inner directories in models
fs.readdirSync(__dirname).filter(function (file) {
  return (file.indexOf('.') !== 0) && fs.statSync(path.join(__dirname, file)).isDirectory()
}).forEach(function (file) {
  fs.readdirSync(path.join(__dirname, file)).filter(function (fileInDir) {
    return (fileInDir.indexOf('.') !== 0)
  }).forEach(function (fileInDir) { importSequelizeModelFile(path.join(file, fileInDir)) })
})

Object.keys(db).forEach(function (modelName) {
  if ('associate' in db[modelName]) {
    db[modelName].associate(db)
  }
})

defineRelationships(sequelize.models)

db.sequelize = sequelize
db.Sequelize = Sequelize
db.options = options

module.exports = db

function importSequelizeModelFile (file) {
  const model = sequelize.import(path.join(__dirname, file))
  db[model.name] = model
}
