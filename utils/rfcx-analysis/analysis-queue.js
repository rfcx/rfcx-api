var Promise = require("bluebird");
var fs = require("fs");
var token = require("../../utils/internal-rfcx/token.js").token;
var aws = require("../../utils/external/aws.js").aws();
var models  = require("../../models");

exports.analysisUtils = {
    /**
     * queue perceptions for cognitive analysis
     *
     * @param {Object}  options:
     {String} api_url_domain

     * @api private
     */
    queueForCognitionAnalysis: function(queueName, event, cognitionParams, options) {
        return new Promise(function(resolve, reject) {
            try {
                var apiWriteBackEndpoint = "/v1/events";
                var apiUrlDomain = options.api_url_domain;
    
                token.createAnonymousToken({
                    token_type: queueName,
                    minutes_until_expiration: 1440,
                    allow_garbage_collection: false,
                    only_allow_access_to: [ "^"+apiWriteBackEndpoint+"$" ]
                }).then(function(tokenInfo){
    
                    var apiTokenGuid = tokenInfo.token_guid,
                        apiToken = tokenInfo.token,
                        apiTokenExpiresAt = tokenInfo.token_expires_at;
                    
                    aws.sns().publish({
                        TopicArn: aws.snsTopicArn(queueName),
                        Message: JSON.stringify({
    
                            api_token_guid: apiTokenGuid,
                            api_token: apiToken,
                            api_token_expires_at: apiTokenExpiresAt,
                            api_url: apiUrlDomain+apiWriteBackEndpoint, 
                            cognition_params: cognitionParams, 
                            event: event 
    
                        })
                    }, function(snsErr, snsData) {
                        if (!!snsErr && !aws.snsIgnoreError()) {
                            console.log(snsErr);
                            reject(new Error(snsErr));
                        } else {
    
                            resolve();
    
                        }
                    });
    
                }).catch(function(err){
                    console.log("error creating access token for analysis worker | "+err);
                    if (!!err) { res.status(500).json({msg:"error creating access token for analysis worker"}); }
                    reject(new Error(err));
                });
    
    
            } catch(err) {
                console.log(err);
                reject(err);
            }
        }.bind(this));
    },




    /**
 * queue an audio object for external analysis
 *
* @param {Object}  options:
*                  {String} audio_guid
                   {String} api_url_domain
                   {String} audio_s3_bucket
                   {String} audio_s3_path
                   {String} audio_sha1_checksum

 * @api private
 */
    queueAudioForAnalysis: function(queueName, analysisModelGuid, options) {
        return new Promise(function(resolve, reject) {

            models.AudioAnalysisModel
            .findOne({ 
              where: { guid: analysisModelGuid }
            }).then(function(dbAnalysisModel){
              if (dbAnalysisModel == null) {
                console.log("failed to find analysis model");
                reject(new Error());
              } else {

                try {

                    var apiWriteBackEndpoint = "/v1/audio/"+options.audio_guid+"/tags",
                        apiUrlDomain = options.api_url_domain,

                        audioS3Bucket = options.audio_s3_bucket,
                        audioS3Path = options.audio_s3_path,
                        audioSha1Checksum = options.audio_sha1_checksum,

                        analysisSampleRate = parseInt(dbAnalysisModel.audio_sample_rate),
                        analysisModelUrl = dbAnalysisModel.model_download_url,
                        analysisModelSha1Checksum = dbAnalysisModel.model_sha1_checksum;

                        token.createAnonymousToken({
                            token_type: "audio-analysis-queue",
                            minutes_until_expiration: 1440,
                            allow_garbage_collection: false,
                            only_allow_access_to: [ "^"+apiWriteBackEndpoint+"$" ]
                        }).then(function(tokenInfo){

                            var apiTokenGuid = tokenInfo.token_guid,
                                apiToken = tokenInfo.token,
                                apiTokenExpiresAt = tokenInfo.token_expires_at,
                                apiTokenMinutesUntilExpiration = Math.round((tokenInfo.token_expires_at.valueOf()-(new Date()).valueOf())/60000);

                            aws.sns().publish({
                                TopicArn: aws.snsTopicArn(queueName),
                                Message: JSON.stringify({
                                
                                    api_token_guid: apiTokenGuid,
                                    api_token: apiToken,
                                    api_token_expires_at: apiTokenExpiresAt,
                                    api_url: apiUrlDomain+apiWriteBackEndpoint,

                                    audio_url: aws.s3SignedUrl(audioS3Bucket, audioS3Path, apiTokenMinutesUntilExpiration),
                                    audio_sha1: audioSha1Checksum,

                                    analysis_method: dbAnalysisModel.method_name,

                                    analysis_model_id: analysisModelGuid,
                                    analysis_model_url: analysisModelUrl,
                                    analysis_model_sha1: analysisModelSha1Checksum
                                    
                                  })
                              }, function(snsErr, snsData) {
                                if (!!snsErr && !aws.snsIgnoreError()) {
                                  console.log(snsErr);
                                  reject(new Error(snsErr));
                                } else {
                                  
                                  resolve();

                                }
                            });

                        }).catch(function(err){
                            console.log("error creating access token for analysis worker | "+err);
                            if (!!err) { res.status(500).json({msg:"error creating access token for analysis worker"}); }
                            reject(new Error(err));
                        });


                } catch(err) {
                    console.log(err);
                    reject(err);
                }

              }
            }).catch(function(err){
              console.log("failed to find analysis model | "+err);
              reject(err);
            });

        }.bind(this));
    }


};

