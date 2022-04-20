const { findOrCreateUser } = require('../../../common/users')
const { createAuth0User, sendChangePasswordEmail } = require('../../../common/auth0')
const { ValidationError, ConflictError } = require('../../../common/error-handling/errors')

async function createInCoreAndAuth0 (data) {
  const [user, created] = await findOrCreateUser(data)
  data.guid = user.guid
  data.invited = true // Set 'invited' to true in 'user_metadata' attribute. After user logs in, it's going to be deleted by "Delete invitation" action in Auth0.
  const [body, statusCode] = await createAuth0User(data)
  if (created === false && statusCode === 409) {
    throw new ConflictError('User already exists')
  }
  if (statusCode !== 201 && statusCode !== 409) { // if user exists in both db and Auth0, respond with 409 error
    console.error(body)
    throw new ValidationError('Failed creating user')
  }
  if (statusCode === 201) {
    await sendChangePasswordEmail(user.email) // because user has "invited" flag, the "change password" email will view Invitation content.
  }
  return user
}

module.exports = createInCoreAndAuth0
