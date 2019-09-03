const request = require('request');
const Promise = require('bluebird');
const util    = require('util');
const guid    = require('../../utils/misc/guid');
const redisClient = require('../../utils/redis');
const generator = require('generate-password');

function getToken() {
  let tokenName = `auth0_token_${process.env.NODE_ENV}`;
  return getTokenFromRedis(tokenName)
    .then((token) => {
      if (!token) {
        return this.getNewToken()
          .then((tokenData) => {
            saveTokenToRedis(tokenName, tokenData);
            return tokenData.access_token;
          });
      }
      return token;
    });
}

function getAuthToken() {
  let tokenName = `auth0_auth_token_${process.env.NODE_ENV}`;
  return getTokenFromRedis(tokenName)
    .then((token) => {
      if (!token) {
        return this.getNewAuthToken()
          .then((tokenData) => {
            saveTokenToRedis(tokenName, tokenData);
            return tokenData.access_token;
          });
      }
      return token;
    });
}

function saveTokenToRedis(tokenName, tokenData) {
  redisClient.set(tokenName, tokenData.access_token, 'EX', tokenData.expires_in);
}

function getTokenFromRedis(tokenType) {
  return redisClient.getAsync(tokenType);
}

function getNewToken(audience) {
  audience = audience || `https://${process.env.AUTH0_DOMAIN}/api/v2/`;
  return new Promise((resolve, reject) => {
    var options = {
      method: 'POST',
      url: `https://${process.env.AUTH0_DOMAIN}/oauth/token`,
      headers: { 'content-type': 'application/json' },
      json: true,
      body: {
        client_id: `${process.env.AUTH0_CLIENT_ID}`,
        client_secret: `${process.env.AUTH0_CLIENT_SECRET}`,
        audience: audience,
        grant_type: 'client_credentials'
      }
    };
    request(options, (error, response, body) => {
      if (error) {
        reject(error);
      }
      else if (!!body && !!body.error) {
        reject(body);
      }
      else {
        resolve(body);
      }
    });
  });
}

function getNewAuthToken() {
  return this.getNewToken(process.env.AUTH0_AUTHZ_AUDIENCE);
}

function createAuth0User(token, opts) {
  if (!opts.password) {
    opts.password = generator.generate({
      length: 20,
      numbers: true,
      symbols: true,
      uppercase: true,
      excludeSimilarCharacters: true,
    });
  }
  return new Promise(function(resolve, reject) {
    request({
      method: 'POST',
      uri: `https://${process.env.AUTH0_DOMAIN}/api/v2/users`,
      json: true,
      headers: {
        authorization: `Bearer ${token}`,
        'Content-type': 'application/json',
      },
      body: {
        user_id: opts.guid || guid.generate(),
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
        },
        email_verified: false,
        verify_email: false,
        app_metadata: {}
      },
    }, (err, response, body) => {
      if (err) {
        reject(err);
      }
      else if (!!body && !!body.error) {
        reject(body);
      }
      else {
        resolve(body);
      }
    });
  });

}

function deleteAuth0User(token, guid) {

  return new Promise(function(resolve, reject) {
    request({
      method: 'DELETE',
      uri: `https://${process.env.AUTH0_DOMAIN}/api/v2/users/${guid}`,
      json: true,
      headers: {
        authorization: `Bearer ${token}`,
        'Content-type': 'application/json',
      },
    }, (err, response, body) => {
      if (err) {
        reject(err);
      }
      else if (!!body && !!body.error) {
        reject(body);
      }
      else {
        resolve(body);
      }
    });
  });

}

function updateAuth0User(token, opts) {

  let body = {};
  if (opts) {
    ['given_name', 'family_name', 'name', 'nickname', 'picture', 'username', 'accessibleSites', 'defaultSite', 'user_metadata'].forEach((param) => {
      if (opts[param] !== undefined) {
        if (param === 'accessibleSites' || param === 'defaultSite') {
          if (!body.app_metadata) {
            body.app_metadata = {};
          }
        }
        if (param === 'accessibleSites') {
          body.app_metadata.accessibleSites = opts.accessibleSites;
          return;
        }
        if (param === 'defaultSite') {
          body.app_metadata.defaultSite = opts.defaultSite;
          return;
        }
        if (param === 'user_metadata') {
          if (!body.user_metadata) {
            body.user_metadata = {};
          }
          body.user_metadata = opts.user_metadata;
          return;
        }
        body[param] = opts[param];
      }
    });
  }

  return new Promise(function(resolve, reject) {
    request({
      method: 'PATCH',
      uri: `https://${process.env.AUTH0_DOMAIN}/api/v2/users/${opts.user_id}`,
      json: true,
      headers: {
        authorization: `Bearer ${token}`,
        'Content-type': 'application/json',
      },
      body: body,
    }, (err, response, body) => {
      if (err) {
        reject(err);
      }
      else if (!!body && !!body.error) {
        reject(body);
      }
      else {
        resolve(body);
      }
    });
  });

}

function updateAuth0UserPassword(token, opts, password) {

  return new Promise(function(resolve, reject) {
    request({
      method: 'PATCH',
      uri: `https://${process.env.AUTH0_DOMAIN}/api/v2/users/${opts.user_id}`,
      json: true,
      headers: {
        authorization: `Bearer ${token}`,
        'Content-type': 'application/json',
      },
      body: {
        password: password,
      },
    }, (err, response, body) => {
      if (err) {
        reject(err);
      }
      else if (!!body && !!body.error) {
        reject(body);
      }
      else {
        resolve(body);
      }
    });
  });

}

function getUsers(token, params) {

  return new Promise(function(resolve, reject) {
    let qs = {
      search_engine: 'v3',
    };
    if (params) {
      ['per_page', 'page', 'include_totals', 'sort', 'fields', 'include_fields', 'q'].forEach((param) => {
        if (params[param] !== undefined) {
          qs[param] = params[param];
        }
      });
    }

    request({
      method: 'GET',
      uri: `https://${process.env.AUTH0_DOMAIN}/api/v2/users`,
      json: true,
      headers: {
        authorization: `Bearer ${token}`,
      },
      qs
    }, (err, response, body) => {
      if (err) {
        reject(err);
      }
      else if (!!body && !!body.error) {
        reject(body);
      }
      else {
        resolve(body);
      }
    });
  });

}

function getAllRoles(token) {

  return new Promise(function(resolve, reject) {
    request({
      method: 'GET',
      uri: `https://${process.env.AUTH0_EXTENSION_URL}/roles`,
      json: true,
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }, (err, res, body) => {
      if (err) {
        reject(err);
      }
      else if (!!body && !!body.error) {
        reject(body);
      }
      else {
        resolve(body);
      }
    });
  });

}

function getAllRoles(token) {

  return new Promise(function(resolve, reject) {
    request({
      method: 'GET',
      uri: `https://${process.env.AUTH0_EXTENSION_URL}/roles`,
      json: true,
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }, (err, res, body) => {
      if (err) {
        reject(err);
      }
      else if (!!body && !!body.error) {
        reject(body);
      }
      else {
        resolve(body);
      }
    });
  });

}

function getAllRolesByLabels(token, names) {

  return getAllRoles(token)
    .then((data) => {
      return data.roles.filter((role) => {
        return names.includes(role.name);
      });
    });

}

function getAllClients(token) {

  return new Promise(function(resolve, reject) {
    request({
      method: 'GET',
      uri: `https://${process.env.AUTH0_DOMAIN}/api/v2/clients`,
      json: true,
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      qs: {
        fields: 'name,description,client_id,app_type,logo_uri'
      }
    }, (err, res, body) => {
      if (err) {
        reject(err);
      }
      else if (!!body && !!body.error) {
        reject(body);
      }
      else {
        resolve(body);
      }
    });
  });

}

function assignRolesToUser(token, userGuid, rolesGuids) {

  rolesGuids = util.isArray(rolesGuids)? rolesGuids : [ rolesGuids ];

  return new Promise(function(resolve, reject) {
    request({
      method: 'PATCH',
      uri: `https://${process.env.AUTH0_EXTENSION_URL}/users/${userGuid}/roles`,
      json: true,
      headers: {
        authorization: `Bearer ${token}`,
        'Content-type': 'application/json',
      },
      body: rolesGuids,
    }, (err, res, body) => {
      if (err) {
        reject(err);
      }
      else if (!!body && !!body.error) {
        reject(body);
      }
      else {
        resolve(body);
      }
    });
  });

}

function deleteRolesFromUser(token, userGuid, rolesGuids) {

  rolesGuids = util.isArray(rolesGuids)? rolesGuids : [ rolesGuids ];

  return new Promise(function(resolve, reject) {
    request({
      method: 'DELETE',
      uri: `https://${process.env.AUTH0_EXTENSION_URL}/users/${userGuid}/roles`,
      json: true,
      headers: {
        authorization: `Bearer ${token}`,
        'Content-type': 'application/json',
      },
      body: rolesGuids,
    }, (err, res, body) => {
      if (err) {
        reject(err);
      }
      else if (!!body && !!body.error) {
        reject(body);
      }
      else {
        resolve(body);
      }
    });
  });

}

function getUserRoles(token, userGuid) {

  return new Promise(function(resolve, reject) {
    request({
      method: 'GET',
      uri: `https://${process.env.AUTH0_EXTENSION_URL}/users/${userGuid}/roles`,
      json: true,
      headers: {
        authorization: `Bearer ${token}`,
      },
    }, (err, res, body) => {
      if (err) {
        reject(err);
      }
      else if (!!body && !!body.error) {
        reject(body);
      }
      else {
        resolve(body);
      }
    });
  });

}

function sendChangePasswordEmail(token, email) {
  return new Promise((resolve, reject) => {
    var options = {
      method: 'POST',
      url: `https://${process.env.AUTH0_DOMAIN}/dbconnections/change_password`,
      headers: { 'content-type': 'application/json' },
      json: true,
      body: {
        client_id: `${process.env.AUTH0_CLIENT_ID}`,
        connection: `${process.env.AUTH0_DEFAULT_DB_CONNECTION}`,
        email
      }
    };
    request(options, (error, response, body) => {
      if (error) {
        reject(error);
      }
      else if (!!body && !!body.error) {
        reject(body);
      }
      else {
        resolve(body);
      }
    });
  });
}

module.exports = {
  getToken,
  getAuthToken,
  getNewToken,
  getNewAuthToken,
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
};
