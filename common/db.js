const Sequelize = require('sequelize')

function getOptions (type) {
  const t = process.env.NODE_ENV === 'test'
  // Optional read-replica routing.
  //
  // When POSTGRES_REPLICA_HOSTNAME is set, Sequelize is configured
  // with a `replication` block: SELECTs are auto-routed to the read
  // pool, everything else (writes, transactions) goes to the write
  // pool. When the env var is unset, behaviour is identical to the
  // previous single-host configuration.
  //
  // Other replica connection params default to the primary's:
  //   POSTGRES_REPLICA_PORT     -> POSTGRES_PORT
  //   POSTGRES_REPLICA_USER     -> POSTGRES_USER
  //   POSTGRES_REPLICA_PASSWORD -> POSTGRES_PASSWORD
  // This matches the rfcx-local replica tier, where the replica
  // exposes the same credentials as the primary (it's a physical/
  // logical streaming replica, not a separate user surface).
  const replicaHost = !t ? process.env.POSTGRES_REPLICA_HOSTNAME : null
  const replicationConfig = replicaHost
    ? {
        write: {
          host: process.env.POSTGRES_HOSTNAME,
          port: process.env.POSTGRES_PORT,
          username: process.env.POSTGRES_USER,
          password: process.env.POSTGRES_PASSWORD
        },
        read: [{
          host: replicaHost,
          port: process.env.POSTGRES_REPLICA_PORT || process.env.POSTGRES_PORT,
          username: process.env.POSTGRES_REPLICA_USER || process.env.POSTGRES_USER,
          password: process.env.POSTGRES_REPLICA_PASSWORD || process.env.POSTGRES_PASSWORD
        }]
      }
    : null
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
    ...(replicationConfig ? { replication: replicationConfig } : {}),
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
