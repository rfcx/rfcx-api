const guardianService = require('./guardians-service')
const hash = require('../../utils/misc/hash.js').hash

async function isTokenCorrect (guardianOrGuid, token) {
  const guardian = await (typeof guardianOrGuid === 'string' ? guardianService.getGuardianByGuid(guardianOrGuid, true) : Promise.resolve(guardianOrGuid))
  if (!guardian) {
    return false
  }
  return guardian.auth_token_hash === hash.hashedCredentials(guardian.auth_token_salt, token)
}

module.exports = {
  isTokenCorrect
}
