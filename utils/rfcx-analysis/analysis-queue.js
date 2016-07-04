var Promise = require("bluebird");
var fs = require("fs");
var token = require("../../utils/internal-rfcx/token.js").token;
var aws = require("../../utils/external/aws.js").aws();

exports.analysisUtils = {

/**
 * queue an audio object for external analysis
 *
* @param {Object}  options:
*                  {String} guardian_guid
*                  {String} checkin_guid
*                  {String} audio_guid
                   {String} api_url_domain
                   {String} audio_s3_path
                   {String} audio_sha1_checksum

 * @return {Object} ...
*                  {String} ...
 * @api private
 */
    queueAudioForAnalysis: function(analysisMethod, analysisModel, audioInfo) {
        return new Promise(function(resolve, reject) {

            var apiEndpoint = "/v1/guardians/"+audioInfo.guardian_guid+"/checkins/"+audioInfo.checkin_guid+"/audio/"+audioInfo.audio_guid+"/events";
            var analysisSampleRate = 8000; // TO-DO this should dynamically be determined based on method+model

            token.createAnonymousToken({
            reference_tag: audioInfo.audio_guid,
            token_type: "analysis",
            created_by: "checkin",
            minutes_until_expiration: 1440,
            allow_garbage_collection: true,
            only_allow_access_to: [ "^"+apiEndpoint+"$" ]
            }).then(function(tokenInfo){

                var apiTokenGuid = tokenInfo.token_guid,
                    apiToken = tokenInfo.token,
                    apiTokenExpiresAt = tokenInfo.token_expires_at,
                    apiTokenMinutesUntilExpiration = Math.round((tokenInfo.token_expires_at.valueOf()-(new Date()).valueOf())/60000);

                aws.sns().publish({
                    TopicArn: aws.snsTopicArn("rfcx-analysis"),
                    Message: JSON.stringify({
                    
                        api_token_guid: apiTokenGuid,
                        api_token: apiToken,
                        api_token_expires_at: apiTokenExpiresAt,
                        api_url: audioInfo.api_url_domain+apiEndpoint,

                        audio_url: aws.s3SignedUrl(process.env.ASSET_BUCKET_AUDIO, audioInfo.audio_s3_path, apiTokenMinutesUntilExpiration),
                        audio_sha1: audioInfo.audio_sha1_checksum,

                        analysis_method: analysisMethod,
                        analysis_model: analysisModel,
                        analysis_sample_rate: analysisSampleRate
                        
                      })
                  }, function(snsErr, snsData) {
                    if (!!snsErr && !aws.snsIgnoreError()) {
                      console.log(snsErr);
                      reject(new Error(snsErr));
                    } else {
                      
                      resolve(audioInfo);

                    }
                });

            }).catch(function(err){
                console.log("error creating access token for analysis worker | "+err);
                if (!!err) { res.status(500).json({msg:"error creating access token for analysis worker"}); }
                reject(new Error(err));
            });

        }.bind(this));
    }


};

