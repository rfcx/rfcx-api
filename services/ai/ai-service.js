var Promise = require("bluebird");
var ValidationError = require('../../utils/converter/validation-error');
var EmptyResultError = require('../../utils/converter/empty-result-error');
var sqlUtils = require("../../utils/misc/sql");
const neo4j = require('../../utils/neo4j');
const S3Service = require('../s3/s3-service');
const guid = require('../../utils/misc/guid');
const audioUtils = require("../../utils/rfcx-audio").audioUtils;
const aws = require("../../utils/external/aws.js").aws();

function getPublicAis(opts) {

  opts = opts || {};
  let query = `MATCH (ai:ai {public: true${opts.isActive? ', isActive: true' : ''}})-[:classifies]->(lb:label) RETURN ai, COLLECT({value: lb.value, label: lb.label}) as labels`;

  const session = neo4j.session();
  const resultPromise = Promise.resolve(session.run(query, opts));

  return resultPromise.then(result => {
    session.close();
    return result.records.map((record) => {
      let ai = Object.assign({}, record.get(0).properties);
      ai.labels = record.get(1);
      return ai;
    });
  });

}

function getPublicCollections(opts) {

  opts = opts || {};
  let query = `MATCH (aic:aiCollection {public: true})-[:classifies]->(lb:label)
               MATCH (aic)-[:current_ai]->(ai:ai)
               RETURN aic, COLLECT({value: lb.value, label: lb.label}) as labels, ai.version as version ORDER BY aic.name ${opts.dir? opts.dir : 'ASC'}`;

  const session = neo4j.session();
  const resultPromise = Promise.resolve(session.run(query, opts));

  return resultPromise.then(result => {
    session.close();

    return result.records.map((record) => {
      let aic = Object.assign({}, record.get(0).properties);
      aic.labels = record.get(1);
      aic.version = record.get(2);
      return aic;
    });
  });

}

function getPublicCollectionAndAisByGuid(guid) {

  let query = `
  MATCH (aic:aiCollection { guid: "${guid}" })-[:classifies]->(lb:label)
  MATCH (aic)-[:has_ai]->(ai:ai {public: true})
  RETURN aic, ai, COLLECT({value: lb.value, label: lb.label}) as labels
  ORDER BY ai.version ASC`;

  const session = neo4j.session();
  const resultPromise = Promise.resolve(session.run(query, { guid }));

  return resultPromise.then(result => {
    let aic = collectionFormatted(result.records);
    session.close();
    return aic;
  });

}

function collectionFormatted(records) {
  let aic = records.map((record) => {
    let aic = Object.assign({}, record.get(0).properties);
    aic.ais = [];
    aic.labels = record.get(2);
    return aic;
  })[0];
  records.forEach((record) => {
    aic.ais.push(Object.assign({}, record.get(1).properties));
  });
  return aic;
}

function getPublicAiByGuid(guid) {

  let query = `MATCH (ai:ai {public: true, guid: {guid}})-[:classifies]->(lb:label) RETURN ai, COLLECT({value: lb.value, label: lb.label}) as labels`;

  const session = neo4j.session();
  const resultPromise = Promise.resolve(session.run(query, { guid }));

  return resultPromise.then(result => {
    session.close();
    if (result.records && !result.records.length) {
      throw new EmptyResultError("AI with given guid not found.");
    }
    return result.records.map((record) => {
      let ai = Object.assign({}, record.get(0).properties);
      ai.labels = record.get(1);
      return ai;
    })[0];
  });

}


function updateAiByGuid(guid, opts) {

  opts.guid = guid;

  let query = `MATCH (ai:ai {public: true, guid: {guid}}) `;
  query = sqlUtils.condAdd(query, opts.stepSeconds !== undefined, ' SET ai.stepSeconds = {stepSeconds}');
  query = sqlUtils.condAdd(query, opts.minWindowsCount !== undefined, ' SET ai.minWindowsCount = {minWindowsCount}');
  query = sqlUtils.condAdd(query, opts.maxWindowsCount !== undefined, ' SET ai.maxWindowsCount = {maxWindowsCount}');
  query = sqlUtils.condAdd(query, opts.minConfidence !== undefined, ' SET ai.minConfidence = {minConfidence}');
  query = sqlUtils.condAdd(query, opts.maxConfidence !== undefined, ' SET ai.maxConfidence = {maxConfidence}');
  query = sqlUtils.condAdd(query, opts.minBoxPercent !== undefined, ' SET ai.minBoxPercent = {minBoxPercent}');
  query = sqlUtils.condAdd(query, opts.guardians !== undefined, ' SET ai.guardiansWhitelist = {guardians}');
  query = sqlUtils.condAdd(query, opts.isActive !== undefined, ' SET ai.isActive = {isActive}');
  query = sqlUtils.condAdd(query, true, ' WITH ai MATCH (ai)-[:classifies]->(lb:label)');
  query = sqlUtils.condAdd(query, true, ' RETURN ai, COLLECT({value: lb.value, label: lb.label}) as labels');

  const session = neo4j.session();
  const resultPromise = Promise.resolve(session.run(query, opts));

  return resultPromise.then(result => {
    session.close();
    if (result.records && !result.records.length) {
      throw new EmptyResultError("AI with given guid not found.");
    }
    return result.records.map((record) => {
      let ai = Object.assign({}, record.get(0).properties);
      ai.labels = record.get(1);
      return ai;
    })[0];
  });

}

function createAi(opts) {

  const session = neo4j.session();
  let proms = [];

  if (opts.aiCollectionGuid) {
    let clearQuery =
      `MATCH (aic:aiCollection { guid: "${opts.aiCollectionGuid}" })-[cur:current_ai]-(ai:ai)
       OPTIONAL MATCH (aic)-[prev:previous_ai]->(:ai)
       DELETE prev
       CREATE (aic)-[:previous_ai]->(ai)
       DELETE cur`;
    let createQuery =
      `MATCH (aic:aiCollection { guid: "${opts.aiCollectionGuid}" })
       MATCH (aic)-[:previous_ai]->(prevai:ai)
       CREATE (ai:ai { created: TIMESTAMP(), name: aic.name + " v"+(prevai.version + 1), guid:"${opts.aiGuid}",
         stepSeconds: ${opts.stepSeconds}, minWindowsCount: ${opts.minWindowsCount}, maxWindowsCount: ${opts.maxWindowsCount},
         minConfidence: ${opts.minConfidence}, maxConfidence: ${opts.maxConfidence}, minBoxPercent: ${opts.minBoxPercent},
         public: ${opts.public}, isActive: ${opts.isActive}, version: (prevai.version + 1), guardiansWhitelist: {guardiansWhitelist}})
       CREATE (aic)-[:current_ai]->(ai)
       CREATE (aic)-[:has_ai]->(ai)
       WITH aic, ai
       MATCH (aic)-[:classifies]->(lb:label)
       CREATE (ai)-[:classifies]->(lb)
       RETURN ai, aic`;

    proms.push(Promise.resolve(session.run(clearQuery)));
    proms.push(Promise.resolve(session.run(createQuery, opts)));
  }
  else {
    let createQuery =
      `CREATE (aic:aiCollection { name: "${opts.name}", guid: "${guid.generate()}", public: ${opts.public}, created: TIMESTAMP()})
       CREATE (ai:ai { name:"${opts.name} v1", guid: "${opts.aiGuid}",
         stepSeconds: ${opts.stepSeconds}, minWindowsCount: ${opts.minWindowsCount}, maxWindowsCount: ${opts.maxWindowsCount},
         minConfidence: ${opts.minConfidence}, maxConfidence: ${opts.maxConfidence}, minBoxPercent: ${opts.minBoxPercent},
         public: ${opts.public}, isActive: ${opts.isActive}, version: 1, guardiansWhitelist: {guardiansWhitelist}})
       CREATE (aic)-[:current_ai]->(ai)
       CREATE (aic)-[:has_ai]->(ai)
       WITH aic, ai
       UNWIND {labels} as labelValue
       MATCH (lb:label {value: labelValue})
       MERGE (aic)-[:classifies]->(lb)<-[:classifies]-(ai)
       RETURN ai, aic`;
    proms.push(Promise.resolve(true)) // stub promise to have same number of results in queue
    proms.push(Promise.resolve(session.run(createQuery, opts)));
  }

  return Promise.all(proms)
    .then(result => {
      session.close();
      if (result[1].records && !result[1].records.length) {
        throw new EmptyResultError("AI not created.");
      }
      return result[1].records.map((record) => {
        return record.get(0).properties;
      })[0];
  });

}

function uploadAIFile(opts) {
  return S3Service.putObject(opts.filePath, opts.fileName, opts.bucket);
}

function downloadAIFile(opts) {
  return S3Service.getObject(opts.filePath, opts.fileName, opts.bucket);
}

function combineTopicQueueNameForGuid(guid) {
  return `prediction-svc-${guid}`;
}

function createSNSSQSStuff(guid) {
  const name = combineTopicQueueNameForGuid(guid);
  let topicARN;
  let queueARN;
  let queueUrl;
  return aws.createTopic(name)
    .then((topicData) => {
      topicARN = topicData.TopicArn;
      let deadletterQueueName = `${name}-deadletter`;
      return aws.createQueue(deadletterQueueName);
    })
    .then((deadletterQueueData) => {
      return aws.getQueueAttributes(deadletterQueueData.QueueUrl, ['QueueArn']);
    })
    .then((deadletterQueueAttrs) => {
      return aws.createQueue(name, {
        VisibilityTimeout: "120",
        RedrivePolicy: JSON.stringify({
          deadLetterTargetArn: deadletterQueueAttrs.Attributes.QueueArn,
          maxReceiveCount: "3"
        })
      });
    })
    .then((queueData) => {
      queueUrl = queueData.QueueUrl;
      return aws.getQueueAttributes(queueUrl, ['QueueArn']);
    })
    .then((queueAttrs) => {
      queueARN = queueAttrs.Attributes.QueueArn
      return aws.subscribeToTopic(topicARN, 'sqs', queueARN);
    })
    .then(() => {
      const attributes = {
        "Policy": JSON.stringify({
          "Version": "2008-10-17",
          "Id": queueARN + "/SQSDefaultPolicy",
          "Statement": [{
            "Sid": "Sid" + new Date().getTime(),
            "Effect": "Allow",
            "Principal": {
                "AWS": "*"
            },
            "Action": "SQS:SendMessage",
            "Resource": queueARN,
            "Condition": {
                "ArnEquals": {
                    "aws:SourceArn": topicARN
                }
            }
          }]
        })
      };
      return aws.setQueueAttributes(queueUrl, attributes);
    })
}

function getSNSSQSInfo(guid) {
  let result = {
    'sns-topic': false,
    'sqs-queue': false,
    'sqs-deadletter-queue': false,
    'sqs-deadletter-connection': false,
    'sns-sqs-subscription': false,
    'sqs-sns-policy': false,
  };

  const name = combineTopicQueueNameForGuid(guid);
  const nameDeadletter = `${name}-deadletter`;
  const topicArn = aws.snsTopicArn(name);

  let queueDeadletterArn, queueArn;

  return aws.getTopicInfo(topicArn)
    .then((topicInfo) => {
      result['sns-topic'] = true;
      return true;
    })
    .then(() => {
      return aws.getQueueUrl(nameDeadletter)
        .then((data) => {
          return aws.getQueueAttributes(data.QueueUrl, ['QueueArn'])
        })
        .then((deadletterQueueAttrs) => {
          queueDeadletterArn = deadletterQueueAttrs.Attributes.QueueArn;
          result['sqs-deadletter-queue'] = true;
          return queueDeadletterArn;
        });
    })
    .then(() => {
      return aws.getQueueUrl(name)
        .then((data) => {
          return aws.getQueueAttributes(data.QueueUrl, ['QueueArn', 'Policy', 'RedrivePolicy'])
        })
        .then((queueAttrs) => {
          queueArn = queueAttrs.Attributes.QueueArn;
          result['sqs-queue'] = true;
          try {
            let policy = JSON.parse(queueAttrs.Attributes.Policy);
            let st = policy.Statement.find((statement) => {
              return statement.Effect === 'Allow' && statement.Action === 'SQS:SendMessage'
                && statement.Condition.ArnEquals['aws:SourceArn'] === topicArn;
            });
            if (st) {
              result['sqs-sns-policy'] = true;
            }
          }
          catch (e) { }
          try {
            let redrivePolicy = JSON.parse(queueAttrs.Attributes.RedrivePolicy);
            if (redrivePolicy.deadLetterTargetArn === queueDeadletterArn) {
              result['sqs-deadletter-connection'] = true;
            }
          }
          catch (e) { }
          return queueArn;
        });
    })
    .then(() => {
      return aws.listSubscriptionsByTopic(topicArn)
    })
    .then((subData) => {
      if (subData && subData.Subscriptions) {
        let sub = subData.Subscriptions.find((subscr) => {
          return subscr.Endpoint === queueArn;
        });
        if (sub) {
          result['sns-sqs-subscription'] = true;
        }
      }
      return result;
    })

}

module.exports = {
  getPublicAis,
  getPublicAiByGuid,
  updateAiByGuid,
  createAi,
  uploadAIFile,
  getPublicCollections,
  getPublicCollectionAndAisByGuid,
  downloadAIFile,
  createSNSSQSStuff,
  getSNSSQSInfo,
  combineTopicQueueNameForGuid,
};
