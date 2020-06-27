const models = require('../../modelsTimescale')


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
      order: ['name'],
    })
}


module.exports = { query }
