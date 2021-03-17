// Copied from StackOverflow - only to be used for testing

const fs = require('fs')
const path = require('path')

async function migrate (sequelize, Sequelize, table = '`SequelizeMeta`') {
  const migrations = fs.readdirSync(path.join(__dirname, '../../migrationsTimescale'))
  await sequelize.query(`CREATE TABLE IF NOT EXISTS ${table} (name VARCHAR(255) NOT NULL UNIQUE)`)
  const completedMigrations = await sequelize.query(`SELECT * FROM ${table}`, { type: Sequelize.QueryTypes.SELECT })

  for (const name in completedMigrations) {
    if (completedMigrations.hasOwnProperty(name)) {
      const index = migrations.indexOf(completedMigrations[name].name)
      if (index !== -1) {
        migrations.splice(index, 1)
      }
    }
  }

  const query = sequelize.queryInterface.sequelize.query
  const regex = /(create_hypertable|INDEX|DROP CONSTRAINT)/ // unsupported by sqlite
  sequelize.queryInterface.sequelize.query = (sql, options = {}) => {
    if (regex.test(sql)) {
      // console.log('Skip unsupported query: ' + sql)
      return Promise.resolve()
    }
    return query.call(sequelize.queryInterface.sequelize, sql, options)
  }

  for (const filename of migrations) {
    const migration = require(path.join(__dirname, '../../migrationsTimescale', filename))
    try {
      await migration.up(sequelize.queryInterface, Sequelize)
      await sequelize.query(`INSERT INTO ${table} VALUES (:name)`, { type: Sequelize.QueryTypes.INSERT, replacements: { name: filename } })
    } catch (err) {
      console.error('Failed performing migration: ' + filename)
      break
    }
  }

  sequelize.queryInterface.sequelize.query = query
}

const truncateOrder = ['Annotation', 'Detection', 'UserStreamRole', 'UserProjectRole', 'UserOrganizationRole', 'Stream', 'Project', 'Organization', 'User', 'RolePermission', 'Role']

async function truncate (models) {
  return await Promise.all(
    truncateOrder.map(key => {
      return models[key].destroy({ where: {}, force: true })
    })
  )
}

module.exports = { migrate, truncate }
