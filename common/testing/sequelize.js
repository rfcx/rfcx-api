const fs = require('fs')
const path = require('path')
const express = require('express')

// Copied from StackOverflow - only to be used for testing
async function migrate (sequelize, Sequelize, table = '"SequelizeMeta"') {
  const migrations = fs.readdirSync(path.join(__dirname, '../../core/_cli/migrations')).filter(filePath => filePath.endsWith('.js'))
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
  sequelize.queryInterface.sequelize.query = (sql, options = {}) => {
    return query.call(sequelize.queryInterface.sequelize, sql, options)
  }

  for (const filename of migrations) {
    const migration = require(path.join(__dirname, '../../core/_cli/migrations', filename))
    try {
      await migration.up(sequelize.queryInterface, Sequelize)
      await sequelize.query(`INSERT INTO ${table} VALUES (:name)`, { type: Sequelize.QueryTypes.INSERT, replacements: { name: filename } })
    } catch (err) {
      console.error(`Failed performing migration: ${filename}`, err)
      break
    }
  }

  sequelize.queryInterface.sequelize.query = query
}

const primaryUserId = 2
const primaryUserGuid = 'b7cc2c4e-bea3-11ed-afa1-0242ac120001'
const primaryUserEmail = 'jb@astonmartin.com'
const primaryUserSub = 'auth0|5e710676eb1ba30c80aeb001'
const primaryUserFirstname = 'James'
const primaryUserLastname = 'Bond'
const otherUserId = 3
const otherUserGuid = 'b7cc2c4e-bea3-11ed-afa1-0242ac120002'
const otherUserEmail = 'em@astonmartin.com'
const otherUserSub = 'auth0|5e710676eb1ba30c80aeb002'
const otherUserFirstname = 'Eve'
const otherUserLastname = 'Moneypenny'
const anotherUserId = 4
const anotherUserGuid = 'b7cc2c4e-bea3-11ed-afa1-0242ac120003'
const anotherUserEmail = 'big@bobby.com'
const anotherUserSub = 'auth0|5e710676eb1ba30c80aeb003'
const anotherUserFirstname = 'Big'
const anotherUserLastname = 'Bobby'
const differentUserId = 5
const differentUserGuid = 'b7cc2c4e-bea3-11ed-afa1-0242ac120004'
const differentUserEmail = 'slim@shady.com'
const differentUserSub = 'auth0|5e710676eb1ba30c80aeb004'
const differentUserFirstname = 'Slim'
const differentUserLastname = 'Shady'
const roleAdmin = 1
const roleMember = 2
const roleGuest = 3
const roleOwner = 4
const seedValues = {
  primaryUserId,
  primaryUserGuid,
  primaryUserEmail,
  primaryUserSub,
  primaryUserFirstname,
  primaryUserLastname,
  otherUserId,
  otherUserGuid,
  otherUserEmail,
  otherUserSub,
  otherUserFirstname,
  otherUserLastname,
  anotherUserId,
  anotherUserGuid,
  anotherUserEmail,
  anotherUserSub,
  anotherUserFirstname,
  anotherUserLastname,
  differentUserId,
  differentUserGuid,
  differentUserEmail,
  differentUserSub,
  differentUserFirstname,
  differentUserLastname,
  roleAdmin,
  roleMember,
  roleGuest,
  roleOwner
}

async function seed (models) {
  await models.ClassificationType.destroy({ where: {} })
  await models.ClassificationSource.destroy({ where: {} })
  await models.User.destroy({ where: {} })
  await models.User.findOrCreate({ where: { id: primaryUserId, guid: primaryUserGuid, username: 'jb', firstname: primaryUserFirstname, lastname: primaryUserLastname, email: primaryUserEmail } })
  await models.User.findOrCreate({ where: { id: otherUserId, guid: otherUserGuid, username: 'em', firstname: otherUserFirstname, lastname: otherUserLastname, email: otherUserEmail } })
  await models.User.findOrCreate({ where: { id: anotherUserId, guid: anotherUserGuid, username: 'st', firstname: anotherUserFirstname, lastname: anotherUserLastname, email: anotherUserEmail } })
  await models.User.findOrCreate({ where: { id: differentUserId, guid: differentUserGuid, username: 'sl', firstname: differentUserFirstname, lastname: differentUserLastname, email: differentUserEmail } })
  await models.ClassificationSource.findOrCreate({ where: { id: 1, value: 'unknown' } })
  await models.ClassificationType.findOrCreate({ where: { id: 1, value: 'unknown' } })
}

const truncateOrder = ['Index', 'IndexType', 'IndexValue', 'Event', 'Annotation', 'DetectionReview', 'Detection', 'ClassifierProcessedSegment', 'ClassifierJobStream', 'ClassifierJobSummary', 'ClassifierJob', 'ClassifierActiveProject', 'ClassifierActiveStream', 'ClassifierDeployment', 'ClassifierEventStrategy', 'ClassifierOutput', 'Classifier', 'EventStrategy', 'ClassificationAlternativeName', 'Classification', 'UserStreamRole', 'UserProjectRole', 'UserOrganizationRole', 'StreamSegment', 'StreamSourceFile', 'AudioFileFormat', 'AudioCodec', 'FileExtension', 'Stream', 'Project', 'Organization']

async function truncate (models) {
  for (const key of truncateOrder) {
    if (models[key] !== undefined) {
      await models[key].destroy({ where: {}, force: true })
    }
  }
}

async function truncateNonBase (models) {
  const m = Object.assign({}, models)
  const baseSeed = ['User', 'RolePermission', 'ClassificationSource', 'ClassificationType']
  baseSeed.forEach((k) => {
    delete m[k]
  })
  return await truncate(m)
}

function expressApp (userAdditions = {}) {
  const app = express()
  app.use(express.json())
  app.use(express.urlencoded({ extended: false }))
  app.use((req, res, next) => {
    req.user = { roles: [] }
    req.rfcx = {
      auth_token_info: {
        id: primaryUserId,
        guid: primaryUserGuid,
        email: primaryUserEmail,
        sub: primaryUserSub,
        ...userAdditions
      }
    }
    req.rfcx.auth_token_info.owner_id = primaryUserId // TODO remove
    next()
  })
  return app
}

function muteConsole (levels = ['log', 'info', 'warn', 'error']) {
  (typeof levels === 'string' ? [levels] : levels).forEach((f) => {
    console[f] = function () {}
  })
}

module.exports = { migrate, seed, seedValues, truncate, truncateNonBase, expressApp, muteConsole }
