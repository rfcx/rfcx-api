var SQS = require("aws-sqs-promises");
var AWS = require("aws-sdk");
var S3 = useMock() ? require("faux-knox") : require("knox");

exports.aws = function() {

  return {

    sqs: function(queueName) {

      // Returns a 'aws-sqs-promise' object.
      // See documentation here:
      // https://www.npmjs.com/package/aws-sqs-promises
      return new SQS({
        name: queueName+"-"+process.env.NODE_ENV,
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_KEY,
        region: process.env.AWS_REGION_ID
      });

    },

    s3: function(bucketName) {

      // Returns a 'knox' object.
      // See documentation here:
      // https://www.npmjs.com/package/knox
      return S3.createClient({
        key: process.env.AWS_ACCESS_KEY_ID,
        secret: process.env.AWS_SECRET_KEY,
        region: process.env.AWS_REGION_ID,
        bucket: getBucket(bucketName)
      });

    },

    s3SignedUrl: function(bucketName,filePath,linkExpirationInMinutes) {

      // Returns a signed url as a string.
      // See documentation here:
      // https://www.npmjs.com/package/knox
      return S3.createClient({
        key: process.env.AWS_ACCESS_KEY_ID,
        secret: process.env.AWS_SECRET_KEY,
        region: process.env.AWS_REGION_ID,
        bucket: getBucket(bucketName)
      }).signedUrl(filePath,signedUrlExpiration);

    },

    sns: function() {

      // Returns a 'AWS.SNS' object.
      return new AWS.SNS({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_KEY,
        region: process.env.AWS_REGION_ID
      });

    },

    snsTopicArn: function(topicName) {
      return "arn:aws:sns:"+process.env.AWS_REGION_ID+":"+process.env.AWS_ACCOUNT_ID+":"+topicName+"-"+process.env.NODE_ENV;
    }

  };
};

function useMock() {
  return /*(process.env.NODE_ENV === "development") ||*/ (process.env.NODE_ENV === "test");
}

function getBucket(bucketName) {
  return useMock() ? process.env.UPLOAD_CACHE_DIRECTORY+"../faux-knox/" : bucketName;
}
