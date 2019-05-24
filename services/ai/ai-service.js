var Promise = require("bluebird");
var ValidationError = require('../../utils/converter/validation-error');
var EmptyResultError = require('../../utils/converter/empty-result-error');
var sqlUtils = require("../../utils/misc/sql");
const neo4j = require('../../utils/neo4j');

function getPublicAis(opts) {

  opts = opts || {};
  let query = `MATCH (ai:ai {public: true})-[:classifies]->(en:entity) RETURN ai, en as entity`;

  const session = neo4j.session();
  const resultPromise = session.run(query, opts);

  return resultPromise.then(result => {
    session.close();
    return result.records.map((record) => {
      let ai = Object.assign({}, record.get(0).properties);
      ai.label = record.get(1).properties['w3#label[]'];
      return ai;
    });
  });

}

function getPublicAiByGuid(guid) {

  let query = `MATCH (ai:ai {public: true, guid: {guid}})-[:classifies]->(en:entity) RETURN ai, en as entity`;

  const session = neo4j.session();
  const resultPromise = Promise.resolve(session.run(query, { guid }));

  return resultPromise.then(result => {
    session.close();
    if (result.records && !result.records.length) {
      throw new EmptyResultError("AI with given guid not found.");
    }
    return result.records.map((record) => {
      let ai = Object.assign({}, record.get(0).properties);
      ai.label = record.get(1).properties['w3#label[]'];
      return ai;
    })[0];
  });

}


function updateAiByGuid(guid, opts) {

  opts.guid = guid;
  let query = `MATCH (ai:ai {public: true, guid: {guid}})-[:classifies]->(en:entity) `;
  query = sqlUtils.condAdd(query, opts.guardians !== undefined, ' SET ai.guardiansWhitelist = {guardians}');
  query = sqlUtils.condAdd(query, true, ' RETURN ai, en as entity');

  const session = neo4j.session();
  const resultPromise = Promise.resolve(session.run(query, opts));

  return resultPromise.then(result => {
    session.close();
    if (result.records && !result.records.length) {
      throw new EmptyResultError("AI with given guid not found.");
    }
    return result.records.map((record) => {
      let ai = Object.assign({}, record.get(0).properties);
      ai.label = record.get(1).properties['w3#label[]'];
      return ai;
    })[0];
  });

}

module.exports = {
  getPublicAis,
  getPublicAiByGuid,
  updateAiByGuid,
};
