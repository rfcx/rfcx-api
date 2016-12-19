var AWS = require("aws-sdk");
var S3 = useAWSMocks() ? require("faux-knox") : require("knox");

exports.aws = function() {

  var that = {

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
      return (useAWSMocks()) ? "s3-mock-signed-url" : S3.createClient({
        key: process.env.AWS_ACCESS_KEY_ID,
        secret: process.env.AWS_SECRET_KEY,
        region: process.env.AWS_REGION_ID,
        bucket: getBucket(bucketName)
      }).signedUrl(filePath,new Date((new Date()).valueOf()+(1000*60*linkExpirationInMinutes)));

    },

    s3ConfirmSave: function(s3Res, savePath) {
      return useAWSMocks() || (s3Res.req.url.indexOf(savePath) >= 0);
    },

    sns: function() {

      // Returns a 'AWS.SNS' object.
      return new AWS.SNS({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_KEY,
        region: process.env.AWS_REGION_ID
      });

    },

    snsIgnoreError: function() {
      return useAWSMocks();
    },

    snsTopicArn: function(topicName) {
      return "arn:aws:sns:"+process.env.AWS_REGION_ID+":"+process.env.AWS_ACCOUNT_ID+":"+topicName+"-"+process.env.NODE_ENV;
    },

    // publish a topic asynchronously via promise API
    publish: function (topic, message) {
      return new Promise(function (resolve, reject) {
        that.sns().publish({
          TopicArn: that.snsTopicArn(topic),
          Message: JSON.stringify(message)
        }, function (snsErr, snsData) {
          if (!!snsErr && !that.snsIgnoreError()) {
            console.log(snsErr);
            reject(new Error(snsErr));
          } else {
            resolve(snsData);
          }
        });
      });
    }

  };
  return that;
};

function useAWSMocks() {
  return /*(process.env.NODE_ENV === "development") ||*/ (process.env.NODE_ENV === "test");
}

function getBucket(bucketName) {
  return useAWSMocks() ? process.cwd()+"/tmp/faux-knox/"+bucketName+"/" : bucketName;
}


