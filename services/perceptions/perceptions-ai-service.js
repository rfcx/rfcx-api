var Converter = require('../../utils/converter/converter')
var CognitionService = require('../cognitions/cognitions-service')
var models = require('../../models')
var aws = require('../../utils/external/aws').aws()
var ValidationError = require('../../utils/converter/validation-error')
var Promise = require('bluebird')
var sequelize = require('sequelize')

function uploadToS3 (localPath, s3Path) {
  return new Promise(function (resolve, reject) {
    aws.s3(process.env.BUCKET_PERCEPTION).putFile(localPath, s3Path, { 'x-amz-acl': 'public-read' }, function (err, s3Res) {
      try {
        s3Res.resume()
      } catch (resumeErr) {
        console.log(resumeErr)
      }
      if (err) {
        console.log(err)
        reject(new Error(err))
      } else if (s3Res.statusCode === 200) {
        resolve()
      } else {
        reject(Error('Could not upload AI to S3.'))
      }
    })
  })
}
module.exports = {
  createAi: function (params) {
    return this.aiExists(params).then(aiExists => {
      if (aiExists) {
        throw new ValidationError('AI with this guid or shortname already exists. Please use a different guid and shortname.')
      }
    })
      .then(() => {
        return this.uploadAi(params)
      })
      .then(() => {
        return this.createAiDb(params)
      })
  },
  aiExists: function (params) {
    var transformedParams = {}
    params = new Converter(params, transformedParams)

    params.convert('guid').toString()
    params.convert('shortname').toString()

    return params.validate().then(() => {
      return models.AudioAnalysisModel.count({ where: { [models.Sequelize.Op.or]: [{ guid: transformedParams.guid }, { shortname: transformedParams.shortname }] } })
        .then(count => {
          return count !== 0
        })
    })
  },
  createAiDb: function (params) {
    var transformedArgs = { method_name: 'v3', audio_sample_rate: 12000 }
    params = new Converter(params, transformedArgs)

    // required probability
    params.convert('minimal_detection_confidence').toFloat().minimum(0.0).maximum(1.0)
    params.convert('minimal_detected_windows').toInt().minimum(1)
    params.convert('shortname').toString()
    params.convert('event_type').toString()
    params.convert('event_value').toString()
    params.convert('guid').toString()
    params.convert('is_active').optional().toBoolean()
    params.convert('experimental').optional().toBoolean()

    // validate will create a promise, if everything is fine the promise resolves and we can go on in then
    // if not the promise is rejected and the caller needs to deal with ValidationError
    return params.validate()
      .then(() => {
        return CognitionService.createCognitionTypeValue(transformedArgs)
      })
      .then(cognitionType => {
        transformedArgs.event_type = cognitionType.event_type_id
        transformedArgs.event_value = cognitionType.event_value_id
      })
      .then(() => {
        return models.AudioAnalysisModel.create(transformedArgs)
      })
      .then(ai => {
        return ai.reload({ include: [{ all: true }] })
      })
  },
  uploadAi: function (params) {
    params = new Converter(params)
    params.convert('model').toString()
    params.convert('attributes').toString()
    params.convert('weights').toString()
    params.convert('guid').toString()

    return params.validate().then(transformedParams => {
      var uploads = []

      uploads.push(uploadToS3(transformedParams.model, `/${transformedParams.guid}/definition.json`))
      uploads.push(uploadToS3(transformedParams.weights, `/${transformedParams.guid}/weights.h5`))
      uploads.push(uploadToS3(transformedParams.attributes, `/${transformedParams.guid}/attributes.json`))

      return Promise.all(uploads)
    })
  },

  updateAi: function (ai, params) {
    var transformedParams = {}
    params = new Converter(params, transformedParams)
    params.convert('event_type').optional().toString()
    params.convert('event_value').optional().toString()
    params.convert('minimal_detection_confidence').optional().toFloat().minimum(0.0).maximum(1.0)
    params.convert('minimal_detected_windows').optional().toInt().minimum(1)
    params.convert('experimental').optional().toBoolean()
    params.convert('shortname').optional().toString()
    params.convert('is_active').optional().toBoolean()

    return params.validate().then(() => {
      if (!!transformedParams.event_type && !!transformedParams.event_value) {
        return CognitionService.createCognitionTypeValue({
          event_value: transformedParams.event_value,
          event_type: transformedParams.event_type
        })
      } else if (transformedParams.event_type) {
        return CognitionService.createCognitionType({
          event_type: transformedParams.event_type
        })
      } else if (transformedParams.event_value) {
        return CognitionService.createCognitionValue({
          event_value: transformedParams.event_value
        })
      } else {
        return {}
      }
    }).then(data => {
      if (data.event_type_id) {
        transformedParams.event_type = data.event_type_id
      }
      if (data.event_value_id) {
        transformedParams.event_value = data.event_value_id
      }
    })
      .then(() => {
        return ai.update(transformedParams)
      })
      .then((aiModel) => {
        return aiModel.reload({
          include: [{ all: true }]
        })
      })
  },

  findAi: function (id) {
    return models.AudioAnalysisModel.findOne({
      where: {
        [models.Sequelize.Op.or]: [
          { guid: id },
          { shortname: id }
        ]
      },
      include: [{ all: true }]
    })
      .then((model) => {
        if (!model) {
          throw new sequelize.EmptyResultError('AI with given guid/shortname not found.')
        }
        return model
      })
  },

  formatAi: function (ai) {
    return {
      guid: ai.guid,
      shortname: ai.shortname,
      method_name: ai.method_name,
      is_active: ai.is_active,
      model_download_url: ai.model_download_url,
      model_sha1_checksum: ai.model_sha1_checksum,
      audio_sample_rate: ai.audio_sample_rate,
      ffmpeg_preprocess_options: ai.ffmpeg_preprocess_options,
      sox_preprocess_options: ai.sox_preprocess_options,
      imagemagick_preprocess_options: ai.imagemagick_preprocess_options,
      minimal_detection_confidence: ai.minimal_detection_confidence,
      minimal_detected_windows: ai.minimal_detected_windows,
      generate_event: ai.generate_event,
      config: ai.config,
      experimental: ai.experimental,
      event_type: ai.GuardianAudioEventType ? ai.GuardianAudioEventType.value : null,
      event_value: ai.GuardianAudioEventValue ? ai.GuardianAudioEventValue.value : null,
      created_at: ai.created_at,
      updated_at: ai.updated_at
    }
  },

  getEventsPrecisionForAI: function (ai) {
    const opts = {
      ai_guid: ai.guid
    }

    const sql = 'SELECT COALESCE(SUM(GuardianAudioEvent.reviewer_confirmed IS TRUE),0) as correct, ' +
                     'COALESCE(SUM(GuardianAudioEvent.reviewer_confirmed IS FALSE),0) as incorrect, ' +
                     'COALESCE(SUM(GuardianAudioEvent.reviewer_confirmed IS NOT NULL),0) as reviewed ' +
                    'FROM GuardianAudioEvents AS GuardianAudioEvent ' +
                    'LEFT JOIN AudioAnalysisModels AS Model ON GuardianAudioEvent.model = Model.id ' +
                    'WHERE Model.guid = :ai_guid '

    return models.sequelize
      .query(sql,
        { replacements: opts, type: models.sequelize.QueryTypes.SELECT }
      )
      .then(function (data) {
        const dataObj = data[0]
        dataObj.precision = dataObj.reviewed > 0 ? (dataObj.correct / dataObj.reviewed) : null
        return dataObj
      })
  }

}
