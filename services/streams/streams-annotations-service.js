const models = require("../../models");
const EmptyResultError = require('../../utils/converter/empty-result-error');
const sqlUtils = require("../../utils/misc/sql");
const exec = require("child_process").exec;
const Promise = require("bluebird");
const path = require('path');
const moment = require('moment-timezone');
const ValidationError = require("../../utils/converter/validation-error");
const ForbiddenError = require("../../utils/converter/forbidden-error");
const audioUtils = require("../../utils/rfcx-audio").audioUtils;
const assetUtils = require("../../utils/internal-rfcx/asset-utils.js").assetUtils;
const eventValueService = require('../events/event-value-service');

const requiredAnnotationAttrs = ['starts', 'ends', 'freq_min', 'freq_max', 'value'];

function getAnnotationByGuid(guid, ignoreMissing) {
  return models.Annotation
    .findOne({
      where: { guid: guid },
      include: [{ all: true }],
    })
    .then((item) => {
      if (!item && !ignoreMissing) { throw new EmptyResultError('Annotation with given guid not found.'); }
      return item;
    });
}

function checkAnnotationsValid(annotations) {
  annotations.forEach((annotation) => {
    requiredAnnotationAttrs.forEach((attr) => {
      if (annotation[attr] === undefined) {
        throw new ValidationError(`${attr} is required for annotation.`);
      }
    })
  });
}

function checkAnnotationBelongsToUser(dbAnnotation, userGuid) {
  if (dbAnnotation.created_by !== userGuid) {
    throw new ForbiddenError(`You don't have permissions to change this annotation.`);
  }
  return true;
}

function saveAnnotations(annotations, stream, userId) {
  let proms = [];
  annotations.forEach((annotation) => {
    let prom = models.GuardianAudioEventValue.findOrCreate({
      where: { $or: { value: annotation.value }},
      defaults: { value: annotation.value }
    })
    .spread((eventValue, created) => {
      return models.Annotation.create({
        confidence: annotation.confidence || 1,
        freq_min: annotation.freq_min,
        freq_max: annotation.freq_max,
        starts: moment.tz(annotation.starts, 'UTC').valueOf(),
        ends: moment.tz(annotation.ends, 'UTC').valueOf(),
        stream: stream.id,
        created_by: userId,
        value: eventValue.id,
      })
      .then(reloadAnnotation);
    });
    proms.push(prom);
  })
  return Promise.all(proms);
}

function updateAnnotation(dbAnnotation, data) {
  return Promise.resolve()
    .then(() => {
      if (data.value) {
        return models.GuardianAudioEventValue.findOrCreate({
          where: { $or: { value: data.value }},
          defaults: { value: data.value }
        })
        .spread((eventValue) => {
          data.value = eventValue.id;
        });
      }
      else {
        return Promise.resolve();
      }
    })
    .then(() => {
      ['confidence', 'freq_min', 'freq_max', 'starts', 'ends', 'value'].forEach((attr) => {
        if (data[attr]) {
          console.log('\n\nupdate', attr, data[attr], '\n');
          dbAnnotation[attr] = data[attr];
        }
      });
      return dbAnnotation.save();
    })
    .then(reloadAnnotation);
}

function reloadAnnotation(dbAnnotation) {
  return dbAnnotation.reload({
    include: [
      {
        model: models.User,
        as: 'User',
        attributes: [ 'guid', 'firstname', 'lastname', 'email' ]
      },
      {
        model: models.GuardianAudioEventValue,
        as: 'Value',
        include: [
          {
            model: models.GuardianAudioEventValueHighLevelKey,
            as: 'HighLevelKey'
          }
        ]
      },
      {
        model: models.Stream,
        as: 'Stream',
        attributes: [ 'guid', 'name' ]
      }
    ]
  });
}

function deleteAnnotationByGuid(guid) {
  return models.Annotation.destroy({ where: { guid } });
}

function deleteAnnotationsForStream(dbStream) {
  return models.Annotation.destroy({ where: { stream: dbStream.id } });
}

function getAnnotationsByParams(params) {
  return models.Annotation
    .findAll({
      where: {
        starts: {
          $gte: moment.tz(params.starts, 'UTC').valueOf(),
        },
        ends: {
          $lte: moment.tz(params.ends, 'UTC').valueOf(),
        },
      },
      include: [
        {
          model: models.User,
          as: 'User',
          attributes: [ 'guid', 'firstname', 'lastname', 'email' ]
        },
        {
          model: models.GuardianAudioEventValue,
          as: 'Value',
          where: params.value? {
            value: params.value
          } : { },
          include: [
            {
              model: models.GuardianAudioEventValueHighLevelKey,
              as: 'HighLevelKey'
            }
          ]
        },
        {
          model: models.Stream,
          as: 'Stream',
          where: {
            guid: params.streamGuid,
          },
          attributes: [ 'guid', 'name' ]
        }
      ]
    })
}

function formatAnnotation(annotation) {
  return {
    guid: annotation.guid,
    confidence: annotation.confidence,
    freq_min: annotation.freq_min,
    freq_max: annotation.freq_max,
    starts: annotation.starts,
    ends: annotation.ends,
    value: {
      value: annotation.Value.value,
      label: eventValueService.combineGuardianAudioEventValueLabel(annotation.Value)
    },
    created_by: annotation.User?
      {
        firstname: annotation.User.firstname,
        lastname: annotation.User.lastname,
        guid: annotation.User.guid,
        email: annotation.User.email
      } : null,
    stream: annotation.Stream?
      {
        guid: annotation.Stream.guid,
        name: annotation.Stream.name,
      } : null,
  }
}

function formatAnnotations(annotations) {
  return annotations.map(formatAnnotation);
}

module.exports = {
  getAnnotationByGuid,
  checkAnnotationsValid,
  checkAnnotationBelongsToUser,
  saveAnnotations,
  updateAnnotation,
  deleteAnnotationByGuid,
  deleteAnnotationsForStream,
  getAnnotationsByParams,
  formatAnnotation,
  formatAnnotations,
}
