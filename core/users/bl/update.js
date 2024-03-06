const { update, getUserByEmail } = require('../../../common/users')
const { updateAuth0User, getToken } = require('../../../common/auth0')
const { ValidationError, ForbiddenError } = require('../../../common/error-handling/errors')

const GOOGLE_AUTH = 'google-oauth2'

async function updateInCoreAndAuth0 (email, data, options) {
  if (options.updatableByEmail !== email) {
    throw new ForbiddenError()
  }

  if (options.auth0Sub.includes(GOOGLE_AUTH)) {
    throw new ValidationError('Changing user data is not possible for social login account type. Please update this data on the social network side.')
  }

  const user = await getUserByEmail(email)
  const token = await getToken()
  const [body, statusCode] = await updateAuth0User(token, {
    given_name: data.firstname,
    family_name: data.lastname,
    picture: data.picture,
    user_id: options.auth0Sub
  })
  if (statusCode !== 200) {
    console.error(body)
    throw new ValidationError('Failed updating user')
  }
  await update(user, data)
}

module.exports = {
  updateInCoreAndAuth0
}
