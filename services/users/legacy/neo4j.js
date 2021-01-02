const neo4j = require('../../utils/neo4j')
const { User } = require('../../../models')

async function ensureUserSyncedInNeo4j (user) {
  if (user instanceof User) {
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

module.exports = { ensureUserSyncedInNeo4j }
