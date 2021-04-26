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
  const { userId, ...opts } = options

  const conditions = [
    'd.start >= $start',
    'd.start < $end'
  ]
  const bind = {
    start: start.toISOString(),
    end: end.toISOString(),
    ...opts
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

  // TODO: Find another way to filter with is_positive and is_reviewed
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

  const detectionsSql = `
    SELECT d.start, d.end, d.confidence, d.stream_id "stream.id", (s.name) "stream.name", (s.project_id) "stream.project_id",
    d.classifier_id "classifier.id", (clf.external_id) "classifier.external_id", (clf.name) "classifier.name", (clf.version) "classifier.version",
    d.classification_id "classification.id", (c.value) "classification.value", (c.title) "classification.title",
    (c.frequency_min) "classification.frequency_min", (c.frequency_max) "classification.frequency_max"
    FROM detections d
    JOIN streams s ON d.stream_id = s.id
    JOIN classifications c ON d.classification_id = c.id
    JOIN classifiers clf ON d.classifier_id = clf.id
    WHERE ${conditions.join(' AND ')}
    ORDER BY d.start
    LIMIT $limit
    OFFSET $offset
  `
  const detections = await models.sequelize.query(detectionsSql, { bind, nest: true, type: models.sequelize.QueryTypes.SELECT })

  if (detections.length === 0) {
    return []
  }

  const annotationBind = {
    start: detections[0].start,
    end: detections[detections.length - 1].start,
    userId
  }

  const annotationConditions = [
    'a.start >= $start',
    'a.start <= $end'
  ]

  if (classifications) {
    annotationConditions.push('a.classification_id = ANY($classifications)')
    annotationBind.classifications = classifications
  }

  if (streams) {
    annotationConditions.push('a.stream_id = ANY($streams)')
    annotationBind.streams = streams
  }

  const annotationsSql = `
    SELECT a.start, a.end, a.classification_id, a.stream_id,
    COUNT(1) total,
    SUM(CASE WHEN a.is_positive THEN 1 ELSE 0 END) positive,
    SUM(CASE WHEN a.created_by_id = $userId AND a.is_positive then 1 ELSE 0 END) me_positive,
    SUM(CASE WHEN a.created_by_id = $userId AND a.is_positive = false THEN 1 ELSE 0 END) me_negative
    FROM annotations a
    WHERE ${annotationConditions.join(' AND ')}
    GROUP BY a.start, a.end, a.classification_id, a.stream_id
    ORDER BY a.start;
  `
  const annotations = await models.sequelize.query(annotationsSql, { bind: annotationBind, type: models.sequelize.QueryTypes.SELECT })

  for (const d of detections) {
    const matchAnnotation = annotations.find(a => {
      const dStart = new Date(d.start)
      const aStart = new Date(a.start)
      return (dStart.toISOString() === aStart.toISOString()) && (d.classification.id === a.classification_id) && (d.stream.id === a.stream_id)
    })
    d.review = {
      total: 0,
      positive: 0,
      negative: 0,
      my: null
    }
    if (matchAnnotation) {
      const my = matchAnnotation.me_positive > 0 ? 'positive' : matchAnnotation.me_negative > 0 ? 'negative' : null
      d.review.total = Number(matchAnnotation.total)
      d.review.positive = Number(matchAnnotation.positive)
      d.review.negative = d.review.total - d.review.positive
      d.review.my = my
    }
  }

  return detections
}

module.exports = {
  query
}
