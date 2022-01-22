const guardianService = require('../../noncore/_services/guardians/guardians-service')
const hash = require('../../common/random/hash')

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
