const fs = require('fs')
const path = require('path')
const express = require('express')

// Copied from StackOverflow - only to be used for testing
async function migrate (sequelize, Sequelize, table = '`SequelizeMeta`') {
  const migrations = fs.readdirSync(path.join(__dirname, '../../migrationsTimescale'))
  await sequelize.query(`CREATE TABLE IF NOT EXISTS ${table} (name VARCHAR(255) NOT NULL UNIQUE)`)
  const completedMigrations = await sequelize.query(`SELECT * FROM ${table}`, { type: Sequelize.QueryTypes.SELECT })

  for (const name in completedMigrations) {
    // eslint-disable-next-line no-prototype-builtins
    if (completedMigrations.hasOwnProperty(name)) {
      const index = migrations.indexOf(completedMigrations[name].name)
      if (index !== -1) {
        migrations.splice(index, 1)
      }
    }
  }

  const query = sequelize.queryInterface.sequelize.query
  const regex = /(create_hypertable|INDEX|ADD CONSTRAINT|DROP CONSTRAINT|DELETE FROM .* USING)/ // unsupported by sqlite
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

const primaryUserId = 1
const primaryUserGuid = 'abc123'
const primaryUserEmail = 'jb@astonmartin.com'
const otherUserId = 2
const roleAdmin = 1
const roleMember = 2
const roleGuest = 3
const seedValues = { primaryUserId, primaryUserGuid, primaryUserEmail, otherUserId, roleAdmin, roleMember, roleGuest }

async function seed (models) {
  await models.User.create({ id: primaryUserId, guid: primaryUserGuid, username: 'jb', firstname: 'James', lastname: 'Bond', email: primaryUserEmail })
  await models.User.create({ id: otherUserId, guid: 'def456', username: 'em', firstname: 'Eve', lastname: 'Moneypenny', email: 'em@astonmartin.com' })
  await models.Role.create({ id: roleAdmin, name: 'Admin' })
  await models.Role.create({ id: roleMember, name: 'Member' })
  await models.Role.create({ id: roleGuest, name: 'Guest' })
  await models.RolePermission.create({ role_id: roleAdmin, permission: 'C' })
  await models.RolePermission.create({ role_id: roleAdmin, permission: 'R' })
  await models.RolePermission.create({ role_id: roleAdmin, permission: 'U' })
  await models.RolePermission.create({ role_id: roleAdmin, permission: 'D' })
  await models.RolePermission.create({ role_id: roleMember, permission: 'C' })
  await models.RolePermission.create({ role_id: roleMember, permission: 'R' })
  await models.RolePermission.create({ role_id: roleMember, permission: 'U' })
  await models.RolePermission.create({ role_id: roleGuest, permission: 'R' })
  await models.ClassificationSource.create({ id: 1, value: 'unknown' })
  await models.ClassificationType.create({ id: 1, value: 'unknown' })
}

const truncateOrder = ['Event', 'Annotation', 'Detection', 'ClassifierActiveProject', 'ClassifierActiveStream', 'ClassifierDeployment', 'ClassifierEventStrategy', 'ClassifierOutput', 'Classifier', 'EventStrategy', 'ClassificationAlternativeName', 'Classification', 'UserStreamRole', 'UserProjectRole', 'UserOrganizationRole', 'StreamSegment', 'StreamSourceFile', 'Stream', 'Project', 'Organization']

async function truncate (models) {
  return await Promise.all(
    truncateOrder.map(key => {
      return models[key].destroy({ where: {}, force: true })
    })
  )
}

function expressApp () {
  const app = express()
  app.use(express.json())
  app.use(express.urlencoded({ extended: false }))
  app.use((req, res, next) => {
    req.user = { roles: [] }
    req.rfcx = { auth_token_info: { id: primaryUserId, guid: primaryUserGuid, email: primaryUserEmail } }
    req.rfcx.auth_token_info.owner_id = primaryUserId // TODO remove
    next()
  })
  return app
}

module.exports = { migrate, seed, seedValues, truncate, expressApp }
