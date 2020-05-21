const moment = require('moment')
const models = require("../../modelsTimescale")

function get (start, end, streamId, classificationIds, limit, offset) {
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

module.exports = { get }