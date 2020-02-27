var AWS = require("aws-sdk");
var S3 = useAWSMocks() ? require("faux-knox") : require("knox");
const EmptyResultError = require('..//converter/empty-result-error');

const _snsClient = new AWS.SNS({
  accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  region:          process.env.AWS_REGION_ID
});

const _sqsClient = new AWS.SQS({
  accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  region:          process.env.AWS_REGION_ID
});

function useAWSMocks() {
  return (process.env.NODE_ENV === "test");
}

function getBucket(bucketName) {
  return useAWSMocks() ? process.cwd()+"/tmp/faux-knox/"+bucketName+"/" : bucketName;
}

let s3Clients = {};

function findOrCreateS3Client(bucketName) {
  if (!s3Clients[bucketName]) {
    s3Clients[bucketName] = S3.createClient({
      key: process.env.AWS_ACCESS_KEY_ID,
      secret: process.env.AWS_SECRET_KEY,
      region: process.env.AWS_REGION_ID,
      bucket: getBucket(bucketName)
    });
  }
  return s3Clients[bucketName];
}

exports.aws = function() {

  var that = {

    s3: function(bucketName) {
      return findOrCreateS3Client(bucketName);
    },

    s3SignedUrl: function(bucketName, filePath, linkExpirationInMinutes) {
      return (useAWSMocks()) ? "s3-mock-signed-url" : findOrCreateS3Client(bucketName)
        .signedUrl(filePath,new Date((new Date()).valueOf()+(1000*60*linkExpirationInMinutes)));
    },

    s3ConfirmSave: function(s3Res, savePath) {
      return useAWSMocks() || (s3Res.req.url.indexOf(savePath) >= 0);
    },

    sns: function() {
      return _snsClient;
    },

    sqs: function() {
      return _sqsClient;
    },

    snsIgnoreError: function() {
      return useAWSMocks();
    },

    snsTopicArn: function(topicName) {
      return "arn:aws:sns:"+process.env.AWS_REGION_ID+":"+process.env.AWS_ACCOUNT_ID+":"+topicName+"-"+process.env.NODE_ENV;
    },

    publish: function (topic, message) {
      return new Promise(function (resolve, reject) {
        const TopicArn = that.snsTopicArn(topic);
        const Message = JSON.stringify(message);
        console.log('\n\n', new Date().toISOString(), ` | Publish sns message to "${TopicArn}":`, Message, '\n\n');
        that.sns().publish({ TopicArn, Message }, function (snsErr, snsData) {
          if (!!snsErr && !that.snsIgnoreError()) {
            reject(new Error(snsErr));
          } else {
            resolve(snsData);
          }
        });
      });
    },

    createTopic: function(topic) {
      return new Promise(function (resolve, reject) {
        const Name = `${topic}-${process.env.NODE_ENV}`;
        that.sns().createTopic({ Name }, function (snsErr, snsData) {
          if (!!snsErr) { reject(new Error(snsErr)); }
          else { resolve(snsData); }
        });
      });
    },

    getTopicInfo: function(TopicArn) {
      return new Promise(function (resolve, reject) {
        that.sns().getTopicAttributes({ TopicArn }, function(err, data) {
          if (!!err) {
            if (err.statusCode === 404 || err.statusCode === 400) {
              reject(new EmptyResultError(`Topic with ARN ${TopicArn} was not found.`));
            }
            reject(new Error(err));
          }
          else { resolve(data); }
        });
      });
    },

    listSubscriptionsByTopic: function(TopicArn) {
      return new Promise(function (resolve, reject) {
        that.sns().listSubscriptionsByTopic({ TopicArn }, function(err, data) {
          if (!!err) { reject(new Error(err)); }
          else { resolve(data); }
        });
      });
    },

    subscribeToTopic: function(TopicArn, Protocol, Endpoint) {
      return new Promise(function (resolve, reject) {
        if (!['http', 'https', 'email', 'email-json', 'sms', 'sqs', 'application', 'lambda'].includes(Protocol)) {
          return reject(new Error('Invalid protocol for SNS topic subscription'));
        }
        that.sns().subscribe({ TopicArn, Protocol, Endpoint }, function (err, data) {
          if (!!err) { reject(new Error(err)); }
          else { resolve(data); }
        });
      });
    },

    createQueue: function(name, attrs) {
      let Attributes = {};
      let possibleAtts = ['DelaySeconds', 'MaximumMessageSize', 'MessageRetentionPeriod', 'Policy',
        'ReceiveMessageWaitTimeSeconds', 'RedrivePolicy', 'deadLetterTargetArn', 'maxReceiveCount',
        'VisibilityTimeout', 'KmsMasterKeyId', 'KmsDataKeyReusePeriodSeconds', 'FifoQueue', 'ContentBasedDeduplication'];
      for (let key in attrs) {
        if (possibleAtts.includes(key) && attrs[key] !== undefined) {
          Attributes[key] = attrs[key];
        }
      }
      const QueueName = `${name}-${process.env.NODE_ENV}`;
      return new Promise(function (resolve, reject) {
        that.sqs()
          .createQueue({ QueueName, Attributes }, function(err, data) {
            if (!!err) { reject(new Error(err)); }
            else { resolve(data); }
          });
      });
    },

    getQueueAttributes: function(QueueUrl, AttributeNames) {
      return new Promise(function (resolve, reject) {
        that.sqs().getQueueAttributes({ QueueUrl, AttributeNames }, function(err, data) {
          if (!!err) {
            if (err.statusCode === 404 || err.statusCode === 400) {
              reject(new EmptyResultError(`Queue with url ${QueueUrl} was not found.`));
            }
            reject(new Error(err));
          }
          else { resolve(data); }
        });
      });
    },

    setQueueAttributes: function(QueueUrl, Attributes) {
      return new Promise(function (resolve, reject) {
        that.sqs().setQueueAttributes({ QueueUrl, Attributes }, function(err, data) {
          if (!!err) {
            if (err.statusCode === 404) {
              reject(new EmptyResultError(`Queue with url ${QueueUrl} was not found.`));
            }
            reject(new Error(err));
          }
          else { resolve(data); }
        });
      });
    },

    addSQSPermission: function(params) {
      return new Promise(function (resolve, reject) {
        that.sqs().addPermission(params, function(err, data) {
          if (!!err) {
            if (err.statusCode === 404) {
              reject(new EmptyResultError(`Queue with url ${params.QueueUrl} was not found.`));
            }
            reject(new Error(err));
          }
          else { resolve(data); }
        });
      });
    },

    getQueueUrl: function(name) {
      return new Promise(function (resolve, reject) {
        const QueueName = `${name}-${process.env.NODE_ENV}`
        that.sqs().getQueueUrl({ QueueName }, function(err, data) {
          if (!!err) {
            if (err.statusCode === 404 || err.statusCode === 400) {
              reject(new EmptyResultError(`Queue with name ${QueueName} was not found.`));
            }
            reject(new Error(err));
          }
          else { resolve(data); }
        });
      });
    },

  };
  return that;
};


