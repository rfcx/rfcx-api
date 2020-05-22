const moment = require('moment')
const models = require("../../modelsTimescale")

function query (start, end, streamId, classificationIds, limit, offset) {
  let condition = {
    start: {
      [models.Sequelize.Op.gte]: moment.utc(start).valueOf(),
    },
    end: {
      [models.Sequelize.Op.lte]: moment.utc(end).valueOf(),
    },
  }
  if (streamId !== undefined) {
    condition['streamId'] = streamId
  }
  if (classificationIds !== undefined) {
    condition['classificationId'] = { [models.Sequelize.Op.or]: classificationIds }
  }
  limit = limit || 100
  offset = offset || 0
  return models.Annotation
    .findAll({
      where: condition,
      include: [
        {
          model: models.Classification,
          as: 'classification',
          attributes: models.Classification.attributes.lite.filter(field => field !== 'id')
        }
      ],
      attributes: models.Annotation.attributes.lite,
      offset: offset,
      limit: limit,
      order: ['start']
    })
}

function create (streamId, start, end, classificationId, frequencyMin, frequencyMax, userId) {
  return models.Annotation.create({
    streamId, start, end, classificationId, frequencyMin, frequencyMax,
    createdBy: userId, updatedBy: userId
  })
}

function get (annotationId) {
  return models.Annotation.findByPk(annotationId)
}

function remove (annotationId) {
  return get(annotationId).then(annotation => annotation.destroy())
}

module.exports = { query, get, create, remove }
