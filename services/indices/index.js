const models = require('../../modelsTimescale')
const EmptyResultError = require('../../utils/converter/empty-result-error')

function query (limit, offset) {
  return models.Index
    .findAll({
      include: [
        {
          as: 'type',
          model: models.IndexType,
          attributes: models.IndexType.attributes.lite,
          required: true
        }
      ],
      attributes: models.Index.attributes.lite,
      offset: offset,
      limit: limit,
      order: ['name']
    })
}

function getId (code) {
  return models.Index
    .findOne({
      where: { code },
      attributes: ['id']
    }).then(item => {
      if (!item) {
        throw new EmptyResultError('Index with given code not found')
      }
      return item.id
    })
}

module.exports = { query, getId }
