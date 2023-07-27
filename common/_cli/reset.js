const cliArgs = process.argv.slice(2)
const type = cliArgs[0] || 'core'

if (type !== 'core' && type !== 'noncore') {
  console.error('Type argument must be "core" or "noncore"')
  process.exit(1)
}
console.info('CLI: Reset started')

const fs = require('fs')
const path = require('path')
const pg = require('pg')
const { Sequelize, QueryTypes } = require('sequelize')

const SCHEMA_SEQUELIZE = 'sequelize'
const TABLE_SEQUELIZE_MIGRATIONS = 'migrations'

if (fs.existsSync(path.join(__dirname, '/../../common/config/env_vars.js'))) {
  const { env } = require(path.join(__dirname, '/../../common/config/env_vars.js'))
  for (const i in env) { process.env[i] = env[i] }
}

async function main () {
  const sequelize = getSequelize()
  await dropTables(sequelize)
}

function getSequelize () {
  console.info('CLI: Creating sequelize')
  const isSsl = process.env.POSTGRES_SSL_ENABLED === 'true'
  const options = {
    username: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: type === 'core' ? process.env.CORE_DB_NAME : process.env.NONCORE_DB_NAME,
    logging: false,
    dialect: 'postgres',
    dialectModule: pg,
    dialectOptions: {
      ssl: isSsl
        ? {
            require: true,
            rejectUnauthorized: false // https://github.com/brianc/node-postgres/issues/2009
          }
        : false
    },
    define: {
      charset: 'utf8',
      collate: 'utf8_general_ci',
      timestamps: true,
      underscored: true
    }
  }

  return new Sequelize(options)
}

async function dropTables (sequelize) {
  console.info('CLI: Dropping tables')

  // Drop all tables under `public`
  const tables = await sequelize.query('SELECT tablename FROM pg_tables WHERE schemaname = \'public\'', { type: QueryTypes.SELECT })
  const sequences = await sequelize.query('SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = \'public\'', { type: QueryTypes.SELECT })

  console.info('Drop table if exists:')
  for (const table of tables) {
    console.info(`- ${table.tablename}`)
    await sequelize.query(`DROP TABLE IF EXISTS "${table.tablename}" CASCADE`)
  }

  console.info('Drop sequence if exists:')
  for (const sequence of sequences) {
    console.info(`- ${sequence.sequence_name}`)
    await sequelize.query(`DROP SEQUENCE IF EXISTS "${sequence.sequence_name}" CASCADE`)
  }

  // Drop "sequelize_meta"
  const migrationsTable = `${SCHEMA_SEQUELIZE}.${TABLE_SEQUELIZE_MIGRATIONS}`
  console.info(`- ${migrationsTable}`)
  await sequelize.query(`DROP TABLE IF EXISTS ${migrationsTable} CASCADE`)
}

main()
  .catch(err => console.error(err))
