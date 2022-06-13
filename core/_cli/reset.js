console.info('CLI: Reset started')

const fs = require('fs')
const path = require('path')
const pg = require('pg')
const { Sequelize, QueryTypes } = require('sequelize')

const SCHEMA_SEQUELIZE = 'sequelize'
const TABLE_SEQUELIZE_MIGRATIONS = 'migrations'
const IS_SSL = false // Could be added to env

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

  const options = {
    username: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
    logging: false,
    dialect: 'postgres',
    dialectModule: pg,
    dialectOptions: {
      ssl: IS_SSL
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

  console.info('Drop if exists:')
  for (const table of tables) {
    console.info(`- public.${table.tablename}`)
    await sequelize.query(`DROP TABLE IF EXISTS public.${table.tablename} CASCADE`)
  }

  // Drop "sequelize_meta"
  const migrationsTable = `${SCHEMA_SEQUELIZE}.${TABLE_SEQUELIZE_MIGRATIONS}`
  console.info(`- ${migrationsTable}`)
  await sequelize.query(`DROP TABLE IF EXISTS ${migrationsTable} CASCADE`)
}

main()
  .catch(err => console.error(err))
