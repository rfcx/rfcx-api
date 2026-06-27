const Sequelize = require('sequelize')

function getOptions (type) {
  const t = process.env.NODE_ENV === 'test'
  // Read/write routing is handled by the infrastructure proxy layer
  // (rfcx-local PostgreSQL HA), NOT by Sequelize. The app connects to a
  // single endpoint (POSTGRES_HOSTNAME) and the proxy is responsible for
  // directing writes to the primary and (optionally) reads to a replica.
  //
  // The previous app-level Sequelize `replication` block (added in
  // rfcx/rfcx-api#654 "replica-routing") has been removed so it does not
  // compete with the proxy's routing. See rfcx-local ADR-017 (Database HA).
  const options = {
    dialect: 'postgres',
    dialectOptions: {
      ssl: process.env.POSTGRES_SSL_ENABLED === 'true' && {
        rejectUnauthorized: false
      }
    },
    host: !t ? process.env.POSTGRES_HOSTNAME : 'localhost',
    port: !t ? process.env.POSTGRES_PORT : 5433,
    database: !t ? (type === 'core' ? process.env.CORE_DB_NAME : process.env.NONCORE_DB_NAME) : 'postgres',
    username: !t ? process.env.POSTGRES_USER : 'postgres',
    password: !t ? process.env.POSTGRES_PASSWORD : 'test',
    migrationStorageTableName: 'migrations',
    migrationStorageTableSchema: 'sequelize',
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

  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'staging') {
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
