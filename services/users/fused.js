const { User: LegacyUser } = process.env.NODE_ENV === 'test' ? require('../../modelsTimescale') : require('../../models')
const { User, Sequelize } = require('../../modelsTimescale')
const EmptyResultError = require('../../utils/converter/empty-result-error')
const ensureUserSyncedInNeo4j = process.env.NEO4J_ENABLED === 'true' ? require('./legacy/neo4j') : undefined

const userBaseInclude = [{
  include: [{ all: true }]
}]

function getByParams (where, opts = {}) {
  // TODO use Timescale as the master
  return LegacyUser.findOne({
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
  return getByParams({ [Sequelize.Op.or]: { guid, email } }, opts)
}

/**
 * Get user id by guid
 * @param {string} guid
 * @returns {number|undefined} user id
 */
async function getIdByGuid (guid) {
  try {
    const user = await getByGuid(guid)
    return user.id
  } catch (err) {
    return undefined
  }
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
  if (ensureUserSyncedInNeo4j) {
    await ensureUserSyncedInNeo4j(user)
  }
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

  return User.findOrCreate({ where, defaults })
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

module.exports = {
  getByParams,
  getByGuid,
  getByEmail,
  getByGuidOrEmail,
  getIdByGuid,
  ensureUserSynced,
  ensureUserSyncedFromToken
}
