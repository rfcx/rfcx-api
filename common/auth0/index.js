const request = require('request')
const { randomGuid } = require('../crypto/random')
const generator = require('generate-password')
const { ForbiddenError } = require('../error-handling/errors')

// a local storage for tokens
const tokens = {
  standard: null,
  auth: null,
  client: null
}

// get token for standard Auth0 API
async function getToken () {
  await checkToken('standard', getNewToken)
  return tokens.standard.access_token
}

// get token for Auth0 Authentication API
async function getAuthToken () {
  await checkToken('auth', getNewAuthToken)
  return tokens.auth.access_token
}

// get token for internal machine-to-machine authentication
async function getClientToken () {
  await checkToken('client', getNewClientToken)
  return tokens.client.access_token
}

async function checkToken (type, requestFunc) {
  if (!tokens[type] || tokens[type].expires_at - Date.now() < 5000) { // it token is not defined or expires in next 5 seconds, request new one
    try {
      const token = await requestFunc()
      if (!token || !token.access_token) {
        throw new Error(`Unable to get Auth0 "${type}" token`)
      }
      token.expires_at = Date.now() + token.expires_in
      tokens[type] = { ...token }
    } catch (e) {
      throw new Error(`Unable to get Auth0 "${type}" token`, e.message)
    }
  }
}

function requestTokenFromAuth0 (audience) {
  return new Promise((resolve, reject) => {
    const options = {
      method: 'POST',
      url: `https://${process.env.AUTH0_DOMAIN}/oauth/token`,
      headers: { 'content-type': 'application/json' },
      json: true,
      body: {
        client_id: `${process.env.AUTH0_CLIENT_ID}`,
        client_secret: `${process.env.AUTH0_CLIENT_SECRET}`,
        audience,
        grant_type: 'client_credentials'
      }
    }
    request(options, (error, response, body) => {
      if (error) {
        reject(error)
      } else if (!!body && !!body.error) {
        reject(body)
      } else {
        resolve(body)
      }
    })
  })
}

function getNewToken () {
  return requestTokenFromAuth0(`https://${process.env.AUTH0_DOMAIN}/api/v2/`)
}

function getNewAuthToken () {
  return requestTokenFromAuth0(process.env.AUTH0_AUTHZ_AUDIENCE)
}

function getNewClientToken () {
  return requestTokenFromAuth0(process.env.AUTH0_CLOUD_AUDIENCE)
}

async function createAuth0User (opts) {
  if (!opts.password) {
    opts.password = generator.generate({
      length: 20,
      numbers: true,
      symbols: true,
      uppercase: true,
      excludeSimilarCharacters: true
    })
  }
  const token = await getToken()
  return new Promise(function (resolve, reject) {
    request({
      method: 'POST',
      uri: `https://${process.env.AUTH0_DOMAIN}/api/v2/users`,
      json: true,
      headers: {
        authorization: `Bearer ${token}`,
        'Content-type': 'application/json'
      },
      body: {
        user_id: opts.guid || randomGuid(),
        connection: process.env.AUTH0_DEFAULT_DB_CONNECTION,
        email: opts.email,
        password: opts.password,
        given_name: opts.firstname,
        family_name: opts.lastname,
        name: `${opts.firstname} ${opts.lastname}`,
        user_metadata: {
          given_name: opts.firstname,
          family_name: opts.lastname,
          name: `${opts.firstname} ${opts.lastname}`,
          ...opts.invited === true ? { invited: true } : {}
        },
        email_verified: false,
        verify_email: false,
        app_metadata: {}
      }
    }, (err, response, body) => {
      if (err) {
        reject(err)
      } else if (!!body && !!body.error) {
        reject(body.error)
      } else {
        resolve([body, response.statusCode])
      }
    })
  })
}

function deleteAuth0User (token, guid) {
  return new Promise(function (resolve, reject) {
    request({
      method: 'DELETE',
      uri: `https://${process.env.AUTH0_DOMAIN}/api/v2/users/${guid}`,
      json: true,
      headers: {
        authorization: `Bearer ${token}`,
        'Content-type': 'application/json'
      }
    }, (err, response, body) => {
      if (err) {
        reject(err)
      } else if (!!body && !!body.error) {
        reject(body)
      } else {
        resolve(body)
      }
    })
  })
}

function updateAuth0User (token, opts) {
  const body = {}
  if (opts) {
    ['given_name', 'family_name', 'name', 'nickname', 'picture', 'subscription_email',
      'username', 'accessibleSites', 'defaultSite', 'user_metadata']
      .forEach((param) => {
        if (opts[param] !== undefined) {
          if (param === 'accessibleSites' || param === 'defaultSite' || param === 'subscription_email') {
            if (!body.app_metadata) {
              body.app_metadata = {}
            }
          }
          if (param === 'accessibleSites') {
            body.app_metadata.accessibleSites = opts.accessibleSites
            return
          }
          if (param === 'defaultSite') {
            body.app_metadata.defaultSite = opts.defaultSite
            return
          }
          if (param === 'subscription_email') {
            body.app_metadata.subscription_email = opts.subscription_email
            return
          }
          if (param === 'user_metadata') {
            if (!body.user_metadata) {
              body.user_metadata = {}
            }
            body.user_metadata = opts.user_metadata
            return
          }
          body[param] = opts[param]
        }
      })
  }

  return new Promise(function (resolve, reject) {
    request({
      method: 'PATCH',
      uri: `https://${process.env.AUTH0_DOMAIN}/api/v2/users/${opts.user_id}`,
      json: true,
      headers: {
        authorization: `Bearer ${token}`,
        'Content-type': 'application/json'
      },
      body
    }, (err, response, body) => {
      if (err) {
        reject(err)
      } else if (!!body && !!body.error) {
        reject(body)
      } else {
        resolve([body, response.statusCode])
      }
    })
  })
}

function updateAuth0UserPassword (token, opts, password) {
  return new Promise(function (resolve, reject) {
    request({
      method: 'PATCH',
      uri: `https://${process.env.AUTH0_DOMAIN}/api/v2/users/${opts.user_id}`,
      json: true,
      headers: {
        authorization: `Bearer ${token}`,
        'Content-type': 'application/json'
      },
      body: {
        password
      }
    }, (err, response, body) => {
      if (err) {
        reject(err)
      } else if (!!body && !!body.error) {
        reject(body)
      } else {
        resolve(body)
      }
    })
  })
}

function getUsers (token, params) {
  return new Promise(function (resolve, reject) {
    const qs = {
      search_engine: 'v3'
    }
    if (params) {
      ['per_page', 'page', 'include_totals', 'sort', 'fields', 'include_fields', 'q'].forEach((param) => {
        if (params[param] !== undefined) {
          qs[param] = params[param]
        }
      })
    }

    request({
      method: 'GET',
      uri: `https://${process.env.AUTH0_DOMAIN}/api/v2/users`,
      json: true,
      headers: {
        authorization: `Bearer ${token}`
      },
      qs
    }, (err, response, body) => {
      if (err) {
        reject(err)
      } else if (!!body && !!body.error) {
        reject(body)
      } else {
        resolve(body)
      }
    })
  })
}

function getAllUsersForExports (token, params) {
  const body = {}
  body.format = 'csv'
  if (params.connection_id) {
    body.connection_id = params.connection_id
  } else {
    body.connection_id = 'con_PV871DvLknTaowmO' // Username-Password-Authentication
    // body.connection_id = 'con_9XwwIr4rydpwOEzu'; // google-oauth2
    // body.connection_id = 'con_zBEnq4j2I4mYsiGl'; // facebook
    // body.connection_id = 'con_SGFRavnGTD5AUj8K'; // email
    // body.connection_id = 'con_hwSaot9tNENSNtAz'; // sms
  }
  if (params.limit) {
    body.limit = params.limit
  }
  body.fields = []
  if (params.fields) {
    params.fields.forEach((field) => {
      body.fields.push({ name: params.fields[field] })
    })
  } else {
    body.fields.push({ name: 'email' }, { name: 'user_id' }, { name: 'name' }, { name: 'given_name' }, { name: 'family_name' },
      { name: 'identities[0].connection', export_as: 'provider' }, { name: 'user_metadata.given_name' }, { name: 'user_metadata.family_name' },
      { name: 'user_metadata.name' })
  }

  return new Promise(function (resolve, reject) {
    request({
      method: 'POST',
      uri: `https://${process.env.AUTH0_DOMAIN}/api/v2/jobs/users-exports`,
      json: true,
      headers: {
        authorization: `Bearer ${token}`,
        'Content-type': 'application/json'
      },
      body
    }, (err, response, body) => {
      if (err) {
        console.error('getAllUsersForExports', err)
        reject(err)
      } else if (!!body && !!body.error) {
        reject(body)
      } else {
        resolve(body)
      }
    })
  })
}

function getAjob (token, opts) {
  return new Promise(function (resolve, reject) {
    request({
      method: 'GET',
      uri: `https://${process.env.AUTH0_DOMAIN}/api/v2/jobs/${opts.id}`,
      headers: {
        authorization: `Bearer ${token}`,
        'Content-type': 'application/json'
      }
    }, (err, response, body) => {
      if (err) {
        console.error('getAjob', err)
        reject(err)
      } else if (!!body && !!body.error) {
        reject(body)
      } else {
        resolve(body)
      }
    })
  })
}

function getAllRoles (token) {
  return new Promise(function (resolve, reject) {
    request({
      method: 'GET',
      uri: `https://${process.env.AUTH0_EXTENSION_URL}/roles`,
      json: true,
      headers: {
        Authorization: `Bearer ${token}`
      }
    }, (err, res, body) => {
      if (err) {
        reject(err)
      } else if (!!body && !!body.error) {
        reject(body)
      } else {
        resolve(body)
      }
    })
  })
}

function getAllRolesByLabels (token, names) {
  return getAllRoles(token)
    .then((data) => {
      return data.roles.filter((role) => {
        return names.includes(role.name)
      })
    })
}

function getAllClients (token) {
  return new Promise(function (resolve, reject) {
    request({
      method: 'GET',
      uri: `https://${process.env.AUTH0_DOMAIN}/api/v2/clients`,
      json: true,
      headers: {
        Authorization: `Bearer ${token}`
      },
      qs: {
        fields: 'name,description,client_id,app_type,logo_uri'
      }
    }, (err, res, body) => {
      if (err) {
        reject(err)
      } else if (!!body && !!body.error) {
        reject(body)
      } else {
        resolve(body)
      }
    })
  })
}

function assignRolesToUser (token, userGuid, rolesGuids) {
  rolesGuids = Array.isArray(rolesGuids) ? rolesGuids : [rolesGuids]

  return new Promise(function (resolve, reject) {
    request({
      method: 'PATCH',
      uri: `https://${process.env.AUTH0_EXTENSION_URL}/users/${userGuid}/roles`,
      json: true,
      headers: {
        authorization: `Bearer ${token}`,
        'Content-type': 'application/json'
      },
      body: rolesGuids
    }, (err, res, body) => {
      if (err) {
        reject(err)
      } else if (!!body && !!body.error) {
        reject(body)
      } else {
        resolve(body)
      }
    })
  })
}

function deleteRolesFromUser (token, userGuid, rolesGuids) {
  rolesGuids = Array.isArray(rolesGuids) ? rolesGuids : [rolesGuids]

  return new Promise(function (resolve, reject) {
    request({
      method: 'DELETE',
      uri: `https://${process.env.AUTH0_EXTENSION_URL}/users/${userGuid}/roles`,
      json: true,
      headers: {
        authorization: `Bearer ${token}`,
        'Content-type': 'application/json'
      },
      body: rolesGuids
    }, (err, res, body) => {
      if (err) {
        reject(err)
      } else if (!!body && !!body.error) {
        reject(body)
      } else {
        resolve(body)
      }
    })
  })
}

function getUserRoles (token, userGuid) {
  return new Promise(function (resolve, reject) {
    request({
      method: 'GET',
      uri: `https://${process.env.AUTH0_EXTENSION_URL}/users/${userGuid}/roles`,
      json: true,
      headers: {
        authorization: `Bearer ${token}`
      }
    }, (err, res, body) => {
      if (err) {
        reject(err)
      } else if (!!body && !!body.error) {
        reject(body)
      } else {
        resolve(body)
      }
    })
  })
}

async function sendChangePasswordEmail (email) {
  return new Promise((resolve, reject) => {
    const options = {
      method: 'POST',
      url: `https://${process.env.AUTH0_DOMAIN}/dbconnections/change_password`,
      headers: { 'content-type': 'application/json' },
      json: true,
      body: {
        client_id: `${process.env.AUTH0_CLIENT_ID}`,
        connection: `${process.env.AUTH0_DEFAULT_DB_CONNECTION}`,
        email
      }
    }
    request(options, (error, response, body) => {
      if (error) {
        reject(error)
      } else if (!!body && !!body.error) {
        reject(body)
      } else {
        resolve(body)
      }
    })
  })
}

function getUserRolesFromToken (token) {
  if (token.roles) { return token.roles }
  const rfcxAppMetaUrl = 'https://rfcx.org/app_metadata'
  if (token[rfcxAppMetaUrl] && token[rfcxAppMetaUrl].authorization && token[rfcxAppMetaUrl].authorization.roles) {
    return token[rfcxAppMetaUrl].authorization.roles
  }
  if (token.scope) {
    if (typeof token.scope === 'string') {
      try {
        const parsedScrope = JSON.parse(token.scope)
        if (parsedScrope.roles) { return parsedScrope.roles }
      } catch (e) { }
    } else {
      if (token.scope.roles) { return token.scope.roles }
    }
  }
  return []
}

function hasAnyRoleFromArray (expectedRoles, roles) {
  if (roles && roles.length > 0 && expectedRoles.some(r => roles.includes(r))) {
    return true
  }
  return false
}

function checkUserConnection (userId, connection, errorMessage) {
  return new Promise((resolve, reject) => {
    const connectionType = userId.split('|')[0]
    if (connectionType !== connection) {
      throw new ForbiddenError(errorMessage || 'Operation not supported for your account type.')
    }
    return resolve()
  })
}

module.exports = {
  getToken,
  getAuthToken,
  getClientToken,
  createAuth0User,
  updateAuth0User,
  getUsers,
  getAllRoles,
  getAllRolesByLabels,
  getAllClients,
  assignRolesToUser,
  deleteRolesFromUser,
  getUserRoles,
  sendChangePasswordEmail,
  deleteAuth0User,
  updateAuth0UserPassword,
  getAllUsersForExports,
  getAjob,
  getUserRolesFromToken,
  hasAnyRoleFromArray,
  checkUserConnection
}
