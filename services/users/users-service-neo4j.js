var Promise = require("bluebird");
const moment = require("moment-timezone");
var ValidationError = require('../../utils/converter/validation-error');
var EmptyResultError = require('../../utils/converter/empty-result-error');
var sqlUtils = require("../../utils/misc/sql");
const neo4j = require('../../utils/neo4j');
const loggers  = require('../../utils/logger');
const logError = loggers.errorLogger.log;

function getUserByParams(opts, ignoreMissing) {

  let query = 'MATCH (user:user) ';
  query = sqlUtils.condAdd(query, true, ' WHERE 1=1');
  query = sqlUtils.condAdd(query, opts.guid, ` AND user.guid = "${opts.guid}"`);
  query = sqlUtils.condAdd(query, opts.email, ` AND user.email = "${opts.email}"`);
  query = sqlUtils.condAdd(query, true, ' RETURN user LIMIT 1');

  const session = neo4j.session();
  const resultPromise = Promise.resolve(session.run(query));

  return resultPromise.then(result => {
    session.close();
    if ((!result.records || !result.records.length) && !ignoreMissing) {
      throw new EmptyResultError('User with given params not found.');
    }
    if (result.records && result.records.length) {
      return result.records.map((record) => {
        return record.get(0).properties;
      })[0];
    }
    return null;
  });

}

function createUserWithParams(user) {

  let query = 'CREATE (user:user { guid: {guid}, firstname: {firstname}, lastname: {lastname}, email: {email}, username: {username}, pictureUrl: {pictureUrl} }) RETURN user';

  const session = neo4j.session();
  const resultPromise = Promise.resolve(session.run(query, {
    guid: user.guid,
    firstname: user.firstname,
    lastname: user.lastname,
    email: user.email,
    username: user.username || user.email.split('@')[0],
    pictureUrl: user.avatar || '',
  }));

  return resultPromise.then(result => {
    session.close();
    return result.records.map((record) => {
      return record.get(0).properties;
    })[0];
  });

}

function updateUserPicture(user) {

  let query = 'MATCH (user:user { guid: {guid}, email: {email} }) SET user.pictureUrl = {pictureUrl} RETURN user';

  const session = neo4j.session();
  const resultPromise = Promise.resolve(session.run(query, {
    guid: user.guid,
    email: user.email,
    pictureUrl: user.avatar || '',
  }));

  return resultPromise.then(result => {
    session.close();
    return result.records.map((record) => {
      return record.get(0).properties;
    })[0];
  });

}

function ensureUserExistsNeo4j(data) {

  return getUserByParams({ guid: data.guid, email: data.email}, true)
    .then((user) => {
      if (!user) {
        return createUserWithParams(data);
      }
      return user;
    });

}

module.exports = {
  getUserByParams,
  createUserWithParams,
  ensureUserExistsNeo4j,
  updateUserPicture,
};
