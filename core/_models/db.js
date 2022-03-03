const Sequelize = require('sequelize')

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
  database: process.env.POSTGRES_DB,
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
    console.info('\nPostgres QUERY--------------------\n', str, '\n----------------------------------')
  }
}

const sequelize = new Sequelize(options)

try {
  sequelize.authenticate()
} catch (error) {
  console.error('Unable to connect to the Core database:', error)
}

module.exports = { sequelize, Sequelize, options }
