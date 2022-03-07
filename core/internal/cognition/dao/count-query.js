const { sequelize, Sequelize: { QueryTypes } } = require('../../../_models')

/**
 *
 * @param {*} parameters
 * @param {string} parameters.start Include detections starting on or after
 * @param {string} parameters.end Include detections starting before
 * @param {number} parameters.classifier Specify the classifier (by id)
 * @param {number} parameters.minConfidence Include detections with a confidence greater or equal to
 * @param {number} parameters.minCount Include results where the count is greater or equal to
 * @param {number} parameters.limit Max results (page size)
 * @param {number} parameters.offset Skip results (page items offset)
 * @returns
 */
function query (parameters) {
  const sql = `
    SELECT stream_id, classification_id, count(1) count, min(start) min_start, max("end") max_end
    FROM detections
    WHERE start >= $start and start < $end and classifier_id = $classifier and confidence >= $minConfidence
    GROUP BY stream_id, classification_id
    HAVING count(1) >= $minCount
    LIMIT $limit OFFSET $offset
  `
  const bind = { ...parameters, start: parameters.start.toISOString(), end: parameters.end.toISOString() }
  return sequelize.query(sql, { bind, type: QueryTypes.SELECT })
}

module.exports = query
