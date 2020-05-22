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

function update (annotationId, start, end, classificationId, frequencyMin, frequencyMax, userId) {
  return get(annotationId).then(annotation => {
    // Timescale time columns cannot be updated (outside of their "chunk interval")
    // so need to delete + create, while maintaining existing createdBy/At + streamId
    return models.sequelize.transaction(transaction => {
      return annotation.destroy({ transaction }).then(() => {
        return models.Annotation.create({
          id: annotationId, streamId: annotation.streamId,
          start, end, classificationId, frequencyMin, frequencyMax,
          createdAt: annotation.createdAt, createdBy: annotation.createdBy, updatedAt: new Date, updatedBy: userId
        }, { transaction, silent: true })
      })
    })
  })
}

function remove (annotationId) {
  return get(annotationId).then(annotation => annotation.destroy())
}

module.exports = { query, get, create, update, remove }
