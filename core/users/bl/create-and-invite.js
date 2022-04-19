const { findOrCreateUser } = require('../../../common/users')
const { createAuth0User, createPasswordChangeTicket } = require('../../../common/auth0')
const { ValidationError, ConflictError } = require('../../../common/error-handling/errors')

async function createInCoreAndAuth0 (data) {
  const [user, created] = await findOrCreateUser(data)
  data.guid = user.guid
  data.invited = true
  const [body, statusCode] = await createAuth0User(data)
  if (created === true && statusCode === 409) {
    throw new ConflictError('User already exists')
  }
  if (statusCode !== 201 && statusCode !== 409) {
    console.error(body)
    throw new ValidationError('Can not create user')
  }
  if (statusCode === 201) {
    const { url, ttl } = await createPasswordChangeTicket(user.email)
    // url += `invite=true&ttl_days=${ttl / 86400}` // add hashed param to the ticket url so Auth0 can customize reset pwd email to invitation
  }
  return user
}

module.exports = createInCoreAndAuth0
