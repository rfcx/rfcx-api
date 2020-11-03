const models = require('../../modelsTimescale')
const EmptyResultError = require('../../utils/converter/empty-result-error')
const includedRelationReducer = require('../../utils/formatters/included-relations')

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
        }
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

function queryByKeyword (keyword, types, limit, offset) {
  const columns = models.Classification.attributes.lite.map(col => `c.${col} AS ${col}`).join(', ')
  const typeColumns = models.ClassificationType.attributes.lite.map(col => `ct.${col} AS "type.${col}"`).join(', ')
  const nameColumns = models.ClassificationAlternativeName.attributes.lite.map(col => `can.${col} AS "alternative_names.${col}"`).join(', ')
  const typeCondition = types === undefined ? '' : 'AND ct.value = ANY($types)'
  const sql = `SELECT ${columns}, ${typeColumns}, ${nameColumns}
       FROM classifications c
       INNER JOIN classification_types ct ON c.type_id = ct.id ${typeCondition}
       LEFT JOIN classification_alternative_names can ON c.id = can.classification_id
       WHERE c.title ILIKE $keyword OR can.name ILIKE $keyword
       ORDER BY c.title, can."rank" LIMIT $limit OFFSET $offset`
  const options = {
    raw: true,
    nest: true,
    bind: {
      keyword: '%' + keyword + '%', types, limit, offset
    }
  }
  return models.sequelize.query(sql, options)
    .reduce(includedRelationReducer('alternative_names'), [])
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

async function queryByStreamIncludeChildren (streamId, childType, limit, offset) {
  const sqlIds = 'SELECT DISTINCT classification_id id FROM annotations WHERE stream_id = $streamId'
  const ids = await models.sequelize.query(sqlIds, { bind: { streamId }, raw: true, type: models.Sequelize.QueryTypes.SELECT })
    .map(x => x.id)

  const sqlTypeId = 'SELECT id FROM classification_types WHERE value = $childType'
  const typeId = (await models.sequelize.query(sqlTypeId, { bind: { childType }, raw: true, type: models.Sequelize.QueryTypes.SELECT }))
    .map(x => x.id).shift()

  const columns = models.Classification.attributes.lite.map(col => `c.${col} AS ${col}`).join(', ')
  const typeColumns = models.ClassificationType.attributes.lite.map(col => `ct.${col} AS "type.${col}"`).join(', ')
  const childrenColumns = models.Classification.attributes.lite.map(col => `cc.${col} AS "children.${col}"`).join(', ')
  const sql = `SELECT ${columns}, ${typeColumns}, ${childrenColumns} FROM classifications c
      INNER JOIN classification_types ct ON c.type_id = ct.id
      LEFT OUTER JOIN classifications cc ON c.id = cc.parent_id AND cc.type_id = $typeId
    WHERE (c.id = ANY($ids) OR EXISTS (SELECT id FROM classifications WHERE id = ANY($ids) AND type_id = $typeId AND parent_id = c.id))
      AND c.type_id != $typeId
    ORDER BY c.title LIMIT $limit OFFSET $offset`
  const options = {
    raw: true,
    nest: true,
    bind: { ids, typeId, limit, offset }
  }
  return models.sequelize.query(sql, options)
    .reduce(includedRelationReducer('children'), [])
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
        }
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
  queryByStreamIncludeChildren,
  queryByParent
}
