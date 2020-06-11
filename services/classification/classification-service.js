const models = require('../../modelsTimescale')
const EmptyResultError = require('../../utils/converter/empty-result-error')


function get (value) {
  return models.Classification
    .findOne({
      where: { value },
      include: [
        {
          model: models.ClassificationType,
          as: 'type',
          attributes: ['value']
        },
        {
          model: models.ClassificationAlternativeName,
          as: 'alternative_names',
          attributes: models.ClassificationAlternativeName.attributes.lite,
          order: ['rank']
        },
        {
          model: models.Annotation,
          as: 'reference_annotations',
          attributes: models.Annotation.attributes.lite,
          through: { attributes: [] }
        },
      ],
      attributes: models.Classification.attributes.full
    })
    .then(item => {
      if (!item) {
        throw new EmptyResultError('Classification with given value not found.')
      }
      return item
    })
}

function getId (value) {
  return models.Classification
    .findOne({
      where: { value },
      attributes: ['id']
    }).then(item => {
      if (!item) {
        throw new EmptyResultError('Classification with given value not found.')
      }
      return item.id
    })
}

/**
 * Given a set of values, returns their ids as an object map
 *
 * @param {Array<String>} values An array of classification values
 * @returns {Promise<Object>} Object that maps values to ids
 */
function getIds (values) {
  return Promise.all(values.map(value => getId(value)))
    .then(ids => {
      // Combine 2 arrays into a map
      const mapping = {}
      for (let i = 0; i < ids.length; i++) {
        mapping[values[i]] = ids[i]
      }
      return mapping
    })
}

function queryByKeyword (keyword, levels) {
  const keywordClause = keyword ? {
        [models.Sequelize.Op.or]: [
          {
            title: {
              [models.Sequelize.Op.iLike]: `%${keyword}%`
            }
          },
          {
            '$alternative_names.name$': {
              [models.Sequelize.Op.iLike]: `%${keyword}%`
            }
          }
        ]
      } : {}
  const typeClause = levels ? { value: { [models.Sequelize.Op.in]: levels } } : {}
  return models.Classification
    .findAll({
      where: keywordClause,
      include: [
        {
          model: models.ClassificationType,
          as: 'type',
          where: typeClause,
          attributes: models.ClassificationType.attributes.lite
        },
        {
          model: models.ClassificationAlternativeName,
          as: 'alternative_names',
          // Only include the alternative names that are matched by the keyword
          attributes: keyword ? models.ClassificationAlternativeName.attributes.lite : [],
          order: ['rank']
        }
      ],
      attributes: models.Classification.attributes.lite
    })
}

function queryByStream (streamId, limit, offset) {
  const columns = models.Classification.attributes.lite.map(col => `c.${col} AS ${col}`).join(', ')
  const typeColumns = models.ClassificationType.attributes.lite.map(col => `"type".${col} AS "type.${col}"`).join(', ')
  const sql = `SELECT DISTINCT ${columns}, ${typeColumns} FROM classifications c
               JOIN annotations a ON c.id = a.classification_id
               JOIN classification_types "type" ON c.type_id = "type".id
               WHERE a.stream_id = $streamId LIMIT $limit OFFSET $offset`
  const options = {
    raw: true,
    nest: true,
    bind: { streamId, limit, offset }
  }
  return models.sequelize.query(sql, options)
}

function queryByParent (value, type) {
  const typeCondition = type !== undefined ? { value: type } : {}
  return models.Classification
    .findAll({
      include: [
        {
          model: models.Classification,
          as: 'parent',
          where: { value },
          attributes: []
        },
        {
          model: models.ClassificationType,
          as: 'type',
          where: typeCondition,
          attributes: []
        },
      ],
      attributes: models.Classification.attributes.lite
    })
}

module.exports = {
  get,
  getId,
  getIds,
  queryByKeyword,
  queryByStream,
  queryByParent,
}
