const models = require('../../_models')
const { EmptyResultError } = require('../../../common/error-handling/errors')
const includedRelationReducer = require('../../_utils/formatters/included-relations')

function get (idOrValue) {
  const where = { [Number.isInteger(idOrValue) || /^\+?\d+$/.test(idOrValue) ? 'id' : 'value']: idOrValue }
  return models.Classification
    .findOne({
      where,
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
async function getIds (values) {
  const classifications = await models.Classification.findAll({
    where: { value: { [models.Sequelize.Op.in]: values } },
    attributes: ['id', 'value']
  })
  const classificationsReduced = classifications.reduce((acc, cur) => {
    acc[cur.value] = cur.id
    return acc
  }, {})
  return values.reduce((acc, value) => {
    if (classificationsReduced[value] === undefined) {
      throw new EmptyResultError(`Classification "${value}" does not exist`)
    }
    acc[value] = classificationsReduced[value]
    return acc
  }, {})
}

async function queryClassificationIdsForClassifiers (allClassifiers, classifiers) {
  const where = {}
  if (!allClassifiers) {
    where.classifier_id = {
      [models.Sequelize.Op.in]: classifiers
    }
  }

  const rawClassificationsIds = await models.ClassifierOutput.findAll({ where, group: 'classification_id', attributes: ['classification_id'], raw: true })

  return rawClassificationsIds.map(c => c.classification_id)
}

async function queryByKeyword (keyword, types, allClassifiers, classifiers, limit, offset) {
  const columns = models.Classification.attributes.lite.map(col => `c.${col} AS ${col}`).join(', ')
  const typeColumns = models.ClassificationType.attributes.lite.map(col => `ct.${col} AS "type.${col}"`).join(', ')
  const nameColumns = models.ClassificationAlternativeName.attributes.lite.map(col => `can.${col} AS "alternative_names.${col}"`).join(', ')
  const typeCondition = types === undefined ? '' : 'AND ct.value = ANY($types)'
  const conditions = []
  if (allClassifiers || classifiers) {
    const classificationIds = await queryClassificationIdsForClassifiers(allClassifiers, classifiers)
    if (classificationIds.length === 0) {
      return []
    }
    conditions.push(`c.id IN (${classificationIds.join(',')})`)
  }

  const bind = { types, limit, offset }

  if (keyword !== undefined || keyword !== '') {
    conditions.push('(c.title ILIKE $keyword OR can.name ILIKE $keyword)')
    bind.keyword = `%${keyword}%`
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const sql = `SELECT ${columns}, ${typeColumns}, ${nameColumns}
       FROM classifications c
       INNER JOIN classification_types ct ON c.type_id = ct.id ${typeCondition}
       LEFT JOIN classification_alternative_names can ON c.id = can.classification_id
       ${where}
       ORDER BY c.title, can."rank" LIMIT $limit OFFSET $offset`
  const options = {
    raw: true,
    nest: true,
    bind
  }

  return await models.sequelize.query(sql, options)
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
