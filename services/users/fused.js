const models = require('../../models')
const modelsTimescale = require('../../modelsTimescale')
const neo4j = require('../../utils/neo4j')
const EmptyResultError = require('../../utils/converter/empty-result-error')

const userBaseInclude = [{
  include: [{ all: true }]
}]

function getByParams (where, opts = {}) {
  return models.User.findOne({
    where,
    include: opts && opts.joinRelations ? userBaseInclude : []
  })
    .then(item => {
      if (!item) {
        throw new EmptyResultError('User with given parameters not found.')
      }
      return item
    })
}

function getByGuid (guid, opts = {}) {
  return getByParams({ guid }, opts)
}

function getByEmail (email, opts = {}) {
  return getByParams({ email }, opts)
}

function getByGuidOrEmail (guid, email, opts = {}) {
  return getByParams({ [models.Sequelize.Op.or]: { guid, email } }, opts)
}

function collectUserDataForSync (req) {
  const { guid, email, picture } = req.rfcx.auth_token_info
  return getByGuidOrEmail(guid, email)
    .then((dbUser) => {
      const { id, firstname, lastname, username } = dbUser
      return { id, firstname, lastname, username, email, guid, picture }
    })
}

async function ensureUserSynced (user) {
  await ensureUserSyncedInTimescaleDB(user)
  await ensureUserSyncedInNeo4j(user)
}

async function ensureUserSyncedFromToken (req) {
  // get combined data from MySQL and Auth0 token
  const user = await collectUserDataForSync(req)
  await ensureUserSynced(user)
}

async function ensureUserSyncedInTimescaleDB (user) {
  const where = {
    guid: user.guid,
    email: user.email
  }

  const defaults = { ...where };
  ['id', 'username', 'firstname', 'lastname', 'picture'].forEach((attr) => {
    if (user[attr]) defaults[attr] = user[attr]
  })

  return modelsTimescale.User.findOrCreate({ where, defaults })
    .spread((dbUser, created) => {
      if (!created) {
        // if some of attributes have changed since last sync then update user
        if (Object.keys(defaults).some(x => !!defaults[x] && dbUser[x] !== defaults[x])) {
          return dbUser.update(defaults)
        }
        return dbUser
      }
    })
}

async function ensureUserSyncedInNeo4j (user) {
  if (user instanceof models.User) {
    user = user.toJSON()
  }
  const searchQuery = 'MATCH (user:user) WHERE user.guid = {guid} AND user.email = {email} RETURN user LIMIT 1'
  const searchsession = neo4j.session()
  const searchResult = await Promise.resolve(searchsession.run(searchQuery, user))
  searchsession.close()
  if (!user.picture) {
    user.picture = ''
  }
  if ((!searchResult.records || !searchResult.records.length)) {
    const creationQuery = 'CREATE (user:user { guid: {guid}, firstname: {firstname}, lastname: {lastname}, email: {email}, username: {username}, pictureUrl: {picture} }) RETURN user'
    const creationSession = neo4j.session()
    const creationResult = await Promise.resolve(creationSession.run(creationQuery, user))
    creationSession.close()
    return creationResult.records.map((record) => {
      return record.get(0).properties
    })[0]
  } else {
    const updateQuery = 'MATCH (user:user { guid: {guid}, email: {email} }) SET user.firstname = {firstname} SET user.lastname = {lastname} SET user.username = {username} SET user.pictureUrl = {picture} RETURN user'
    const updateSession = neo4j.session()
    const updateResult = await Promise.resolve(updateSession.run(updateQuery, user))
    updateSession.close()
    return updateResult.records.map((record) => {
      return record.get(0).properties
    })[0]
  }
}

module.exports = {
  getByParams,
  getByGuid,
  getByEmail,
  getByGuidOrEmail,
  ensureUserSynced,
  ensureUserSyncedFromToken
}
