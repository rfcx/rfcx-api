require('../../common/config')
/**
 * This script creates a row in "UserTokens" table.
 * These tokens are used in legacy authenticaion system which is still uses somewhere in Noncore API.
 * Please follow instructions (1, 2, 3) below.
 */
const moment = require('moment')
const { hashedCredentials } = require('../../common/crypto/sha256')
const { randomString } = require('../../common/crypto/random')
const { User, UserToken } = require('../_models')

const userGuid = '<user_id>' // 1. put user guid here
const expiresIn = [2, 'years'] // 2. put required values here

User.findOne({ where: { guid: userGuid } })
  .then(async (user) => {
    if (!user) { throw Error('User not found') }
    const existingTokens = await UserToken.findAll({ where: { user_id: user.id, type: 'login' } })
    const validTokens = existingTokens.filter(t => { return new Date(t.auth_token_expires_at) > new Date() })
    if (validTokens.length) {
      console.log(`User has ${validTokens.length} valid login tokens`, validTokens.map(t => t.toJSON()))
      return
    }
    const salt = randomString(62)
    const token = randomString(12) // 3. put existing token here if you need
    const hash = hashedCredentials(salt, token)
    const userToken = await UserToken.create({
      type: 'login',
      auth_token_salt: salt,
      auth_token_hash: hash,
      auth_token_expires_at: moment.utc().add(expiresIn[0], expiresIn[1]).toISOString(),
      user_id: user.id
    })
    console.log('Created token', userToken.toJSON())
  })
  .catch((err) => {
    console.log(err)
  })
