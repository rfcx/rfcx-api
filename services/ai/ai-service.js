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

function createAi(opts) {

  let query = `MATCH (:\`lemon#LexicalEntry\` { id:"wn/${opts.lexicalEntryId.split(/[#]/)[0]}-n"})-[:\`lemon#sense\`]->({\`wdo#sense_number\`:${opts.lexicalEntryId.slice(-1)}})-[:\`lemon#reference\`]->(valueType) with valueType
  MATCH (u:user{guid: "${opts.userGuid}"})
  CREATE (aic:aiCollection{name:"${opts.name}", guid:"${opts.aiCollectionGuid}", created: TIMESTAMP()})
  CREATE (aic)-[:requires]->(t:task)
  CREATE (aic)-[:has_ai]->(ai:ai{name:"${opts.name} v1", guid:"${opts.aiGuid}", trainingDone:false, accuracy: 0.0,
  stepSeconds: ${opts.stepSeconds}, minWinwowsCount: ${opts.minWinwowsCount}, maxWindowsCount: ${opts.maxWindowsCount},
  minConfidence: ${opts.minConfidence}, maxConfidence: ${opts.maxConfidence}, minBoxPercent: ${opts.minBoxPercent},
  public: ${opts.public}, guardiansWhitelist: ${guardians}})
  CREATE (aic)-[:current_ai]->(ai)
  CREATE (aic)-[:previous_ai]->(ai)
  MERGE (u)<-[:has_aiCollectionSet]-(aics:aiCollectionSet)
  CREATE (aics)-[:contains]->(aic)
  CREATE (valueType)<-[:classifies]-(aic)
  CREATE (valueType)<-[:classifies]-(ai)
  return ai, aic `;

  const session = neo4j.session();
  const resultPromise = Promise.resolve(session.run(query, opts));

  return resultPromise.then(result => {
    session.close();
    if (result.records && !result.records.length) {
      throw new EmptyResultError("AI not created.");
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
  createAi,
};
