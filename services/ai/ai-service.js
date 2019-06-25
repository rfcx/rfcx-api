var Promise = require("bluebird");
var ValidationError = require('../../utils/converter/validation-error');
var EmptyResultError = require('../../utils/converter/empty-result-error');
var sqlUtils = require("../../utils/misc/sql");
const neo4j = require('../../utils/neo4j');

function getPublicAis(opts) {

  opts = opts || {};
  let query = `MATCH (ai:ai {public: true})-[:classifies]->(en:entity) RETURN ai, en as entity`;

  const session = neo4j.session();
  const resultPromise = Promise.resolve(session.run(query, opts));

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

  const session = neo4j.session();
  let proms = [];

  if (opts.version > 1) {
    let clearQuery =
      `MATCH (aic:aiCollection { guid: "${opts.aiCollectionGuid}" })-[cur:current_ai]-(ai:ai)
       CREATE (aic)-[:previous_ai]->(ai)
       DELETE cur`;
    let createQuery =
      `MATCH (aic:aiCollection { guid: "${opts.aiCollectionGuid}" })-[:classifies]->(en:entity)
       CREATE (ai:ai { created: TIMESTAMP(), name:"${opts.name} v${opts.version}", guid:"${opts.aiGuid}",
         stepSeconds: ${opts.stepSeconds}, minWindowsCount: ${opts.minWindowsCount}, maxWindowsCount: ${opts.maxWindowsCount},
         minConfidence: ${opts.minConfidence}, maxConfidence: ${opts.maxConfidence}, minBoxPercent: ${opts.minBoxPercent},
         public: ${opts.public}, version: ${opts.version}}, guardiansWhitelist: {guardiansWhitelist})
       CREATE (aic)-[:current_ai]->(ai)
       CREATE (aic)-[:has_ai]->(ai)
       CREATE (ai)-[:classifies]->(en)
       RETURN ai, aic`;

    proms.push(Promise.resolve(session.run(clearQuery)));
    proms.push(Promise.resolve(session.run(createQuery, opts)));
  }
  else {
    let createQuery =
      `MATCH (:\`lemon#LexicalEntry\` { id:"wn/${opts.lexicalEntryId.split(/[#]/)[0]}-n"})-[:\`lemon#sense\`]->({\`wdo#sense_number\`:${opts.lexicalEntryId.slice(-1)}})-[:\`lemon#reference\`]->(valueType) with valueType
       CREATE (aic:aiCollection { name: "${opts.name}", guid: "${opts.aiCollectionGuid}", created: TIMESTAMP()})
       CREATE (ai:ai { name:"${opts.name} v${opts.version}", guid: "${opts.aiGuid}",
         stepSeconds: ${opts.stepSeconds}, minWindowsCount: ${opts.minWindowsCount}, maxWindowsCount: ${opts.maxWindowsCount},
         minConfidence: ${opts.minConfidence}, maxConfidence: ${opts.maxConfidence}, minBoxPercent: ${opts.minBoxPercent},
         public: ${opts.public}, version: ${opts.version}, guardiansWhitelist: {guardiansWhitelist}})
       CREATE (aic)-[:current_ai]->(ai)
       CREATE (aic)-[:has_ai]->(ai)
       CREATE (valueType)<-[:classifies]-(aic)
       CREATE (valueType)<-[:classifies]-(ai)
       RETURN ai, aic`;
    proms.push(Promise.resolve(session.run(createQuery, opts)));
  }

  return Promise.all(proms)
    .then(result => {
      session.close();
      if (result[0].records && !result[0].records.length) {
        throw new EmptyResultError("AI not created.");
      }
      return result[0].records.map((record) => {
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
