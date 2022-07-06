const Sequelize = require('sequelize')

function getOptions (type) {
  const baseOptions = {
    logging: false,
    define: {
      underscored: true,
      charset: 'utf8',
      dialectOptions: {
        collate: 'utf8_general_ci'
      },
      timestamps: true,
      createdAt: 'created_at', // force sequelize to respect snake_case for created_at
      updatedAt: 'updated_at' // force sequelize to respect snake_case for updated_at
    }
  }

  const dbConfigPostgres = {
    dialect: 'postgres',
    dialectOptions: {
      ssl: process.env.POSTGRES_SSL_ENABLED === 'true' && {
        rejectUnauthorized: false
      }
    },
    host: process.env.POSTGRES_HOSTNAME,
    port: process.env.POSTGRES_PORT,
    database: type === 'core' ? process.env.CORE_DB_NAME : process.env.NONCORE_DB_NAME,
    username: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    migrationStorageTableName: 'migrations',
    migrationStorageTableSchema: 'sequelize'
  }

  const dbConfigSqlite = {
    dialect: 'sqlite'
  }

  const options = {
    ...baseOptions,
    ...(process.env.NODE_ENV === 'test' ? dbConfigSqlite : dbConfigPostgres)
  }

  if (process.env.NODE_ENV === 'development') {
    options.logging = function (str) {
      console.info(`\n${type} query--------------------\n${str}\n----------------------------------`)
    }
  }
  return options
}

module.exports = function (type) {
  const options = getOptions(type)
  const sequelize = new Sequelize(options)
  try {
    sequelize.authenticate()
  } catch (error) {
    console.error(`Unable to connect to the ${type} database:`, error)
  }
  return { sequelize, Sequelize, options }
}
