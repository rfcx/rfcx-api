const { findOrCreateUser } = require('../../../common/users')
const { createAuth0User, sendChangePasswordEmail } = require('../../../common/auth0')
const { ValidationError, ConflictError } = require('../../../common/error-handling/errors')

async function createInCoreAndAuth0 (data) {
  const [user, created] = await findOrCreateUser(data)
  data.guid = user.guid
  data.invited = true // Set 'invited' to true in 'user_metadata' attribute. After user logs in, it's going to be deleted by "Delete invitation" action in Auth0.
  const [body, statusCode] = await createAuth0User(data)
  if (created === true && statusCode === 409) {
    throw new ConflictError('User already exists')
  }
  if (statusCode !== 201 && statusCode !== 409) {
    console.error(body)
    throw new ValidationError('Can not create user')
  }
  if (statusCode === 201) {
    await sendChangePasswordEmail(user.email)
  }
  return user
}

module.exports = createInCoreAndAuth0
