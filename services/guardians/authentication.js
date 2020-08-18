const guardianService = require('./guardians-service')
const hash = require("../../utils/misc/hash.js").hash;

async function isTokenCorrect(guardianOrGuid, token) {
  console.log('\n\nisTokenCorrect', guardianOrGuid, token, '\n\n');
  const guardian = await (typeof guardianOrGuid === 'string' ? guardianService.getGuardianByGuid(guardianOrGuid, true) : Promise.resolve(guardianOrGuid))
  console.log('\n\nguardian', guardian, '\n\n')
  if (!guardian) {
    return false
  }
  const hhh = hash.hashedCredentials(guardian.auth_token_salt, token)
  console.log('\n\n hhh', hhh, '\n\n');
  return guardian.auth_token_hash == hhh
}

module.exports = {
  isTokenCorrect
}
