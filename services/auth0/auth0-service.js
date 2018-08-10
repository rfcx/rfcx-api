const request = require('request');
const Promise = require('bluebird');
const util    = require('util');
const guid    = require('../../utils/misc/guid');
const hash    = require('../../utils/misc/hash').hash;

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
      else {
        resolve(body);
      }
    });
  });
}

function getNewAuthToken() {
  return this.getNewToken(process.env.AUTH0_AUTHZ_AUDIENCE);
}

function createAuth0User(tokenData, opts) {

  return new Promise(function(resolve, reject) {
    request({
      method: 'POST',
      uri: `https://${process.env.AUTH0_DOMAIN}/api/v2/users`,
      json: true,
      headers: {
        authorization: `${tokenData.token_type} ${tokenData.access_token}`,
        'Content-type': 'application/json',
      },
      body: {
        user_id: opts.guid || guid.generate(),
        connection: process.env.AUTH0_DEFAULT_DB_CONNECTION,
        email: opts.email,
        password: opts.password || hash.randomString(50),
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
      else {
        resolve(body);
      }
    });
  });

}

function getAllRoles(tokenData) {

  return new Promise(function(resolve, reject) {
    request({
      method: 'GET',
      uri: `https://${process.env.AUTH0_EXTENSION_URL}/roles`,
      json: true,
      headers: {
        'Authorization': `${tokenData.token_type} ${tokenData.access_token}`,
      },
    }, (err, res, body) => {
      if (err) {
        reject(err);
      }
      else {
        resolve(body);
      }
    });
  });

}

function getAllClients(tokenData) {

  return new Promise(function(resolve, reject) {
    request({
      method: 'GET',
      uri: `https://${process.env.AUTH0_DOMAIN}/api/v2/clients`,
      json: true,
      headers: {
        'Authorization': `${tokenData.token_type} ${tokenData.access_token}`,
      },
      qs: {
        fields: 'name,description,client_id,app_type,logo_uri'
      }
    }, (err, res, body) => {
      if (err) {
        reject(err);
      }
      else {
        resolve(body);
      }
    });
  });

}

function assignRolesToUser(tokenData, userGuid, rolesGuids) {

  rolesGuids = util.isArray(rolesGuids)? rolesGuids : [ rolesGuids ];

  return new Promise(function(resolve, reject) {
    request({
      method: 'PATCH',
      uri: `https://${process.env.AUTH0_EXTENSION_URL}/users/${userGuid}/roles`,
      json: true,
      headers: {
        authorization: `${tokenData.token_type} ${tokenData.access_token}`,
        'Content-type': 'application/json',
      },
      body: rolesGuids,
    }, (err, res, body) => {
      if (err) {
        reject(err);
      }
      else {
        resolve(body);
      }
    });
  });

}

function sendChangePasswordEmail(tokenData, email) {
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
      else {
        resolve(body);
      }
    });
  });
}

module.exports = {
  getNewToken,
  getNewAuthToken,
  createAuth0User,
  getAllRoles,
  getAllClients,
  assignRolesToUser,
  sendChangePasswordEmail,
};
