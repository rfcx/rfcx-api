var Promise = require('bluebird')
var token = require('../../utils/internal-rfcx/token.js').token
var aws = require('../../utils/external/aws.js').aws()
var models = require('../../models')
const moment = require('moment-timezone')

function snsPublishAsync (queueName, options, tokenInfo, dbAnalysisModel) {
  return new Promise(function (resolve, reject) {
    var apiUrlDomain = options.api_url_domain

    var audioS3Bucket = options.audio_s3_bucket
    var audioS3Path = options.audio_s3_path
    var audioSha1Checksum = options.audio_sha1_checksum
    var analysisModelUrl = dbAnalysisModel.model_download_url
    var analysisModelGuid = dbAnalysisModel.guid
    var analysisModelSha1Checksum = dbAnalysisModel.model_sha1_checksum

    var apiTokenGuid = tokenInfo.token_guid
    var apiToken = tokenInfo.token
    var apiTokenExpiresAt = tokenInfo.token_expires_at
    var apiTokenMinutesUntilExpiration = Math.round((tokenInfo.token_expires_at.valueOf() - (new Date()).valueOf()) / 60000)
    var apiWriteBackEndpoint = '/v1/audio/' + options.audio_guid + '/tags'

    aws.sns().publish({
      TopicArn: aws.snsTopicArn(queueName),
      Message: JSON.stringify({

        api_token_guid: apiTokenGuid,
        api_token: apiToken,
        api_token_expires_at: apiTokenExpiresAt,
        api_url: apiUrlDomain + apiWriteBackEndpoint,

        audio_url: aws.s3SignedUrl(audioS3Bucket, audioS3Path, apiTokenMinutesUntilExpiration),
        audio_sha1: audioSha1Checksum,

        analysis_method: dbAnalysisModel.method_name,

        analysis_model_id: analysisModelGuid,
        analysis_model_url: analysisModelUrl,
        analysis_model_sha1: analysisModelSha1Checksum

      })
    }, function (snsErr, snsData) {
      if (!!snsErr && !aws.snsIgnoreError()) {
        console.error(snsErr)
        reject(new Error(snsErr))
      } else {
        resolve()
      }
    })
  })
}

// Todo: Refactor to use new aws.publish function
exports.analysisUtils = {
  /**
     * queue perceptions for cognitive analysis
     *
     * @param {Object}  options:
     {String} api_url_domain

     * @api private
     */
  queueForCognitionAnalysis: function (queueName, event, cognitionParams, options) {
    return new Promise(function (resolve, reject) {
      try {
        var apiWriteBackEndpoint = '/v1/events'
        var apiUrlDomain = options.api_url_domain

        token.createAnonymousToken({
          token_type: queueName,
          minutes_until_expiration: 1440,
          allow_garbage_collection: true,
          only_allow_access_to: ['^' + apiWriteBackEndpoint + '$']
        }).then(function (tokenInfo) {
          var apiTokenGuid = tokenInfo.token_guid
          var apiToken = tokenInfo.token
          var apiTokenExpiresAt = tokenInfo.token_expires_at

          aws.sns().publish({
            TopicArn: aws.snsTopicArn(queueName),
            Message: JSON.stringify({

              api_token_guid: apiTokenGuid,
              api_token: apiToken,
              api_token_expires_at: apiTokenExpiresAt,
              api_url: apiUrlDomain + apiWriteBackEndpoint,
              cognition_params: cognitionParams,
              event: event

            })
          }, function (snsErr, snsData) {
            if (!!snsErr && !aws.snsIgnoreError()) {
              console.log(snsErr)
              reject(new Error(snsErr))
            } else {
              resolve()
            }
          })
        }).catch(function (err) {
          console.log('error creating access token for analysis worker | ' + err)
          reject(new Error(err))
        })
      } catch (err) {
        console.log(err)
        reject(err)
      }
    })
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
  queueAudioForAnalysis: function (queueName, analysisModelGuid, options) {
    return new Promise(function (resolve, reject) {
      models.AudioAnalysisModel
        .findOne({
          where: { guid: analysisModelGuid }
        }).then(function (dbAnalysisModel) {
          if (dbAnalysisModel == null) {
            console.log('failed to find analysis model')
            reject(new Error('failed to find analysis model'))
          } else {
            try {
              var apiWriteBackEndpoint = '/v1/audio/' + options.audio_guid + '/tags'
              var apiUrlDomain = options.api_url_domain

              var audioS3Bucket = options.audio_s3_bucket
              var audioS3Path = options.audio_s3_path
              var audioSha1Checksum = options.audio_sha1_checksum

              var analysisModelUrl = dbAnalysisModel.model_download_url
              var analysisModelSha1Checksum = dbAnalysisModel.model_sha1_checksum

              return token.createAnonymousToken({
                token_type: 'audio-analysis-queue',
                minutes_until_expiration: 1440,
                allow_garbage_collection: true,
                only_allow_access_to: ['^' + apiWriteBackEndpoint + '$']
              }).then(function (tokenInfo) {
                var apiTokenGuid = tokenInfo.token_guid
                var apiToken = tokenInfo.token
                var apiTokenExpiresAt = tokenInfo.token_expires_at
                var apiTokenMinutesUntilExpiration = Math.round((tokenInfo.token_expires_at.valueOf() - (new Date()).valueOf()) / 60000)

                return aws.sns().publish({
                  TopicArn: aws.snsTopicArn(queueName),
                  Message: JSON.stringify({

                    api_token_guid: apiTokenGuid,
                    api_token: apiToken,
                    api_token_expires_at: apiTokenExpiresAt,
                    api_url: apiUrlDomain + apiWriteBackEndpoint,

                    audio_url: aws.s3SignedUrl(audioS3Bucket, audioS3Path, apiTokenMinutesUntilExpiration),
                    audio_sha1: audioSha1Checksum,

                    analysis_method: dbAnalysisModel.method_name,

                    analysis_model_id: analysisModelGuid,
                    analysis_model_url: analysisModelUrl,
                    analysis_model_sha1: analysisModelSha1Checksum

                  })
                }, function (snsErr, snsData) {
                  if (!!snsErr && !aws.snsIgnoreError()) {
                    console.error(snsErr)
                    reject(new Error(snsErr))
                  } else {
                    resolve()
                  }
                })
              })
                .catch(function (err) {
                  console.error('Error creating access token for analysis worker | ' + err)
                  reject(new Error(err))
                })
            } catch (err) {
              console.log(err)
              reject(err)
            }
          }
        }).catch(function (err) {
          console.log('failed to find analysis model | ' + err)
          reject(err)
        })
    })
  },

  batchQueueAudioForAnalysis: function (queueName, analysisModelGuid, batch) {
    return new Promise(function (resolve, reject) {
      models.AudioAnalysisModel
        .findOne({
          where: { guid: analysisModelGuid }
        }).then(function (dbAnalysisModel) {
          if (dbAnalysisModel == null) {
            console.log('failed to find analysis model')
            reject(new Error())
          } else {
            var endpointAccess = '/v1/audio/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/tags'

            return token.createAnonymousToken({
              token_type: 'audio-analysis-queue',
              minutes_until_expiration: 1440,
              allow_garbage_collection: true,
              only_allow_access_to: ['^' + endpointAccess + '$']
            }).then(function (tokenInfo) {
              return Promise.map(batch, function (options) {
                snsPublishAsync(queueName, options, tokenInfo, dbAnalysisModel)
              }, { concurrency: process.env.AWS_QUEUE_CONCURRENCY })
            }).then(function () {
              resolve()
            }).catch(function (err) {
              console.log('error creating access token for analysis worker | ' + err)
              reject(new Error(err))
            })
          }
        }).catch(function (err) {
          console.log('failed to find analysis model | ' + err)
          reject(err)
        })
    })
  },

  prepareWsObject: function (dbAudio, tagsJson, creator) {
    const wsObj = []
    const timezone = dbAudio.Site.timezone
    tagsJson.forEach((tag) => {
      wsObj.push({
        creator: {
          type: tag.tagged_by_model !== undefined ? 'ai' : 'user',
          guid: creator.guid
        },
        time: {
          start: {
            UTC: moment.tz(tag.begins_at, timezone).toISOString(),
            localTime: moment.tz(tag.begins_at, timezone).format(),
            timeZone: timezone
          },
          end: {
            UTC: moment.tz(tag.ends_at, timezone).toISOString(),
            localTime: moment.tz(tag.ends_at, timezone).format(),
            timeZone: timezone
          }
        },
        frequency: {
          min: 0, // no data for now
          max: dbAudio.Format ? dbAudio.Format.sample_rate : 0 // no data for now
        },
        guardianGuid: dbAudio.Guardian.guid,
        probability: tag.confidence,
        type: tag.type,
        value: tag.value,
        sensationGuids: [dbAudio.guid],
        perceptionGuid: tag.guid
      })
    })
    return wsObj
  }

}
