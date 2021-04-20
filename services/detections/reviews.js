const models = require('../../modelsTimescale')

/**
 * Get a list of detections integrate with annotations
 * @param {*} filters
 * @param {string} filters.start
 * @param {string} filters.end
 * @param {string | string[]} filters.streams Stream id or list of stream ids
 * @param {string | string[]} filters.projects Project id or list of project ids
 * @param {string | string[]} filters.classifiers Classifier id or list of classifier ids
 * @param {string | string[]} filters.classifications Classification or list of classifications
 * @param {number} filters.minConfidence Minimum confidence to query detections
 * @param {boolean} filters.isReviewed
 * @param {boolean} filters.isPositive
 * @param {*} options
 * @param {number} options.limit Maximum number to get detections
 * @param {number} options.offset Number of resuls to skip
 * @param {number} options.userId User to check for review status
 * @returns {Detection[]} Detections
 */
async function query (filters, options) {
  const { start, end, streams, projects, classifiers, classifications, minConfidence, isReviewed, isPositive } = filters

  const conditions = [
    'd.start >= $start',
    'd.start < $end'
  ]
  const bind = {
    start: start.toISOString(),
    end: end.toISOString(),
    ...options
  }

  if (streams) {
    conditions.push('d.stream_id = ANY($streams)')
    bind.streams = streams
  }

  if (projects) {
    conditions.push('s.project_id = ANY($projects)')
    bind.projects = projects
  }

  if (classifiers) {
    conditions.push('d.classifier_id = ANY($classifiers)')
    bind.classifiers = classifiers
  }

  if (classifications) {
    conditions.push('c.value = ANY($classifications)')
    bind.classifications = classifications
  }

  if (minConfidence) {
    conditions.push('d.confidence >= $minConfidence')
    bind.minConfidence = minConfidence
  }

  if (isPositive) {
    conditions.push('a.is_positive')
  } else if (isPositive === false) {
    conditions.push('NOT a.is_positive')
  }

  if (isReviewed) {
    conditions.push('a.is_positive IS NOT null')
  } else if (isReviewed === false) {
    conditions.push('a.is_positive IS null')
  }

  const sql = `SELECT d.start, d.end, d.classification_id "classification.id", (c.value) "classification.value", (c.title) "classification.title",
    d.classifier_id "classifier.id", (clf.external_id) "classifier.external_id", (clf.name) classifier_name, (clf.version) classifier_version,
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
    WHERE ${conditions.join(' AND ')}
    GROUP BY d.start, d.end, d.classification_id, c.value, c.title, d.classifier_id, clf.name, clf.version, clf.external_id, d.stream_id, s.name, d.confidence
    LIMIT $limit
    OFFSET $offset`
  const results = await models.sequelize.query(sql, {
    bind,
    nest: true,
    type: models.sequelize.QueryTypes.SELECT
  })

  console.log(results)

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
