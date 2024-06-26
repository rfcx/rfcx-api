const guardianService = require('../../noncore/_services/guardians/guardians-service')
const { hashedCredentials } = require('../../common/crypto/sha256')

async function isTokenCorrect (guardianOrGuid, token) {
  const guardian = await (typeof guardianOrGuid === 'string' ? guardianService.getGuardianByGuid(guardianOrGuid, true) : Promise.resolve(guardianOrGuid))
  if (!guardian) {
    return false
  }
  return guardian.auth_token_hash === hashedCredentials(guardian.auth_token_salt, token)
}

module.exports = {
  isTokenCorrect
}
