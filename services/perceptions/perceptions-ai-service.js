var Converter = require("../../utils/converter/converter");
var CognitionService = require("../cognitions/cognitions-service");
var models = require("../../models");
var views = require("../../views/v1");
const versionName = "v3";
var aws = require("../../utils/external/aws").aws();
var ValidationError = require("../../utils/converter/validation-error");
module.exports = {
  createAi: function (params) {
    return this.aiExists(params).then(aiExists => {
      if (aiExists) {
        throw new ValidationError("AI with this guid or shortname already exists. Please use a different guid and shortname.")
      }
    })
      .then(() => {
        return this.uploadAi(params)
      })
      .then(() => {
        return this.createAiDb(params);
      });
  },
  aiExists: function (params) {
    var transformedParams = {};
    params = new Converter(params, transformedParams);

    params.convert("guid").toString();
    params.convert("shortname").toString();

    return params.validate().then(() => {
     return models.AudioAnalysisModel.count({where: {$or: [{guid: transformedParams.guid}, {shortname: transformedParams.shortname}]}})
        .then(count => {
          return count != 0;
        });
    });
  },
  createAiDb: function (params) {
    var transformedArgs = {method_name: "v3", audio_sample_rate: 12000};
    params = new Converter(params, transformedArgs);

    // required probability
    params.convert("minimal_detection_confidence").toFloat().minimum(0.0).maximum(1.0);
    params.convert("minimal_detected_windows").toInt().minimum(1);
    params.convert("shortname").toString();
    params.convert("event_type").toString();
    params.convert("event_value").toString();
    params.convert("guid").toString();

    // validate will create a promise, if everything is fine the promise resolves and we can go on in then
    // if not the promise is rejected and the caller needs to deal with ValidationError
    return params.validate().then(() => {
      return CognitionService.createCognitionType(transformedArgs);
    }).then(cognitionType => {
      transformedArgs.event_type = cognitionType.event_type_id;
      transformedArgs.event_value = cognitionType.event_value_id;
    }).then(() => {
      return models.AudioAnalysisModel.upsert(transformedArgs);
    });
  },
  uploadAi: function (params) {
    params = new Converter(params);
    params.convert("archive").toString();
    params.convert("guid").toString();

    var remoteFilePath = null;


    return params.validate().then(transformedParams => {
      return new Promise(function (resolve, reject) {
        remoteFilePath = `/${versionName}/models/${process.env.NODE_ENV}/rfcx-model-${transformedParams.guid}.tar.gz`;
        aws.s3(process.env.BUCKET_ANALYSIS).putFile(transformedParams.archive, remoteFilePath, function (err, s3Res) {
          try {
            s3Res.resume();
          } catch (resumeErr) {
            console.log(resumeErr);
          }
          if (!!err) {
            console.log(err);
            reject(new Error(err));
          } else if (200 == s3Res.statusCode) {
            resolve();
          } else {
            reject(Error("Could not upload AI to S3."));
          }
        });
      });
    });

  }


};
