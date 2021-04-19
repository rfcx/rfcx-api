const models = require('../../modelsTimescale')

/**
 * Get a list of detections integrate with annotations
 * @param {string} start
 * @param {string} end
 * @param {string | string[]} streams Stream id or list of stream ids
 * @param {string | string[]} projects Project id or list of project ids
 * @param {string | string[]} classifiers Classifier id or list of classifier ids
 * @param {string | string[]} classifications Classification or list of classifications
 * @param {number} minConfidence Minimum confidence to query detections
 * @param {boolean} isReviewed
 * @param {boolean} isPositive
 * @param {number} limit Maximum number to get detections
 * @param {number} offset Number of resuls to skip
 * @param {object} user
 * @returns {Detection[]} Detections
 */
async function query (opts, user) {
  const { start, end, streams, projects, classifiers, classifications, minConfidence, isReviewed, isPositive, limit, offset } = opts
  let conditions = 'WHERE d.start > $start AND d.end < $end'
  const userId = user.id

  if (streams) {
    conditions = conditions + ' AND d.stream_id = ANY($streams)'
  }

  if (projects) {
    conditions = conditions + ' AND s.project_id = ANY($projects)'
  }

  if (classifiers) {
    conditions = conditions + ' AND d.classifier_id = ANY($classifiers)'
  }

  if (classifications) {
    conditions = conditions + ' AND c.value = ANY($classifications)'
  }

  if (minConfidence) {
    conditions = conditions + ' AND d.confidence >= $minConfidence'
  }

  if (isPositive) {
    conditions = conditions + ' AND a.is_positive'
  }

  if (isPositive === false) {
    conditions = conditions + ' AND NOT a.is_positive'
  }

  if (isReviewed) {
    conditions = conditions + ' AND a.is_positive IS NOT null'
  }

  if (isReviewed === false) {
    conditions = conditions + ' AND a.is_positive IS null'
  }

  const sql =
      `
        SELECT d.start, d.end, d.classification_id, (c.value) classification_value, (c.title) classification_title,
        d.classifier_id, (clf.external_id) classifier_external_id, (clf.name) classifier_name, (clf.version) classifier_version,
        d.stream_id, (s.name) stream_name, d.confidence,
        SUM(CASE WHEN a.is_positive IS NOT null THEN 1 ELSE 0 END) total,
        SUM(CASE WHEN a.is_positive THEN 1 ELSE 0 END) number_of_positive,
        SUM(CASE WHEN a.created_by_id = $userId AND a.is_positive then 1 ELSE 0 END) me_positive,
        SUM(CASE WHEN a.created_by_id = $userId AND a.is_positive = false THEN 1 ELSE 0 END) me_negative
        FROM detections d
        JOIN streams s ON d.stream_id = s.id
        JOIN classifications c ON d.classification_id = c.id
        JOIN classifiers clf ON d.classifier_id = clf.id
        LEFT JOIN annotations a ON d.stream_id = a.stream_id AND d.classification_id = a.classification_id AND d.start >= a.start AND d.end <= a.end
        ${conditions}
        GROUP BY d.start, d.end, d.classification_id, c.value, c.title, d.classifier_id, clf.name, clf.version, clf.external_id, d.stream_id, s.name, d.confidence
        LIMIT $limit
        OFFSET $offset
      `
  const results = await models.sequelize.query(sql, { bind: { start, end, streams, projects, classifiers, classifications, minConfidence, limit, offset, userId }, type: models.sequelize.QueryTypes.SELECT })

  return results.map(review => {
    const total = Number(review.total)
    const positive = Number(review.number_of_positive)
    return {
      start: review.start,
      end: review.end,
      stream: {
        id: review.stream_id,
        name: review.stream_name
      },
      classifier: {
        id: review.classifier_id,
        external_id: review.classifier_external_id,
        name: review.classifier_name,
        version: review.classifier_version
      },
      classification: {
        id: review.classification_id,
        value: review.classification_value,
        title: review.classification_title
      },
      confidence: review.confidence,
      number_of_reviewed: total,
      number_of_positive: positive,
      number_of_negative: total - positive,
      me_reviewed: review.me_positive === 0 || review.me_negative === 0,
      me_positive: review.me_positive !== 0 && review.me_negative === 0,
      me_negative: review.me_negative !== 0 && review.me_positive === 0
    }
  })
}

module.exports = {
  query
}
