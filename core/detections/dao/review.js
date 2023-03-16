const { ForbiddenError } = require('../../../common/error-handling/errors')
const { DetectionReview, Sequelize } = require('../../_models')
const Op = Sequelize.Op

async function create (data, options = {}) {
  const transaction = options.transaction || null
  const { detectionId, userId, status } = data
  return await DetectionReview.create({ detectionId, userId, status }, { transaction })
}

/**
 * Get a list of detection reviews matching the conditions
 * @param {*} filters Detection Review attributes to filter
 * @param {string[]} filters.detectionIds detection ids
 * @param {number} filters.createdBy Where created by the given user id
 * @param {number[]} filters.reviewStatuses -1 - negative, 0 - uncertain, 1 - positive
 * @param {*} options Query options
 * @param {string[]} options.fields Attributes and relations to include in results
 * @param {number} options.limit Maximum results to include
 * @param {number} options.offset Number of results to skip
 */
async function query (filters, options = {}) {
  if (filters.detectionIds === undefined) {
    throw new ForbiddenError('You must select detection ids to search for detection reviews')
  }
  const where = {
    detectionId: {
      [Op.in]: filters.detectionIds
    }
  }
  if (filters.userId) {
    where.userId = filters.userId
  }
  if (filters.reviewStatuses) {
    where.reviewStatus = {
      [Op.in]: filters.reviewStatuses
    }
  }

  const attributes = options.fields && options.fields.length > 0 ? DetectionReview.attributes.full.filter(a => options.fields.includes(a)) : DetectionReview.attributes.lite
  const { limit, offset } = options
  const transaction = options.transaction || null

  return await DetectionReview.findAll({ where, attributes, limit, offset, transaction })
}

async function update (id, data, options = {}) {
  const transaction = options.transaction || null
  const upd = {}
  const allowedUpdates = ['status']
  allowedUpdates.forEach(k => {
    if (data[k] !== undefined) {
      upd[k] = data[k]
    }
  })
  return await DetectionReview.update(upd, { where: { id }, transaction })
}

module.exports = { create, query, update }

// const models = require('../../_models')
// const { getAccessibleObjectsIDs, PROJECT, STREAM } = require('../../roles/dao')
// const streamDao = require('../../streams/dao')

// // async function create (opts) {
// //   const { streamId, start, isPositive, user } = opts
// // }

// /**
//  * Get detections conditions and bind
//  * @param {*} options
//  * @param {number} options.limit Maximum number to get detections
//  * @param {number} options.offset Number of resuls to skip
//  * @param {number | undefined} options.readableBy Include detections readable to the given user id or include all if undefined
//  * @param { number } options.userId User id
//  * @param {string} start
//  * @param {string} end
//  * @param {string[] | undefined} streams Stream id or list of stream ids
//  * @param {string[] | undefined} projects Project id or list of project ids
//  * @param {string[] | undefined} classifiers Classifier id or list of classifier ids
//  * @param {string[] | undefined} classifications Classification or list of classifications
//  * @param {number} minConfidence Minimum confidence to query detections
//  * @param {boolean} isReviewed
//  * @param {boolean} isPositive
//  * @returns {Detection[]} Detections
//  */
// async function getConditionsAndBind (options, start, end, streams, projects, classifiers, classifications, minConfidence, isReviewed, isPositive) {
//   const conditions = [
//     'd.start >= $start',
//     'd.start < $end'
//   ]
//   const { readableBy, ...opts } = options
//   const bind = {
//     start: start.toISOString(),
//     end: end.toISOString(),
//     ...opts
//   }

//   const projectsAndStreamsConditions = []

//   /**
//    * Check if the user has permission or has a special role e.g. super, system.
//    * If it is a normal user, check the projects by permission.
//    * If it is a special role user, allow every projects.
//    */
//   if (streams) {
//     projectsAndStreamsConditions.push('d.stream_id = ANY($streams)')
//     bind.streams = readableBy === undefined ? streams : await getAccessibleObjectsIDs(readableBy, STREAM, streams, 'R', true)
//   } else if (projects) {
//     projectsAndStreamsConditions.push('s.project_id = ANY($projects)')
//     bind.projects = readableBy === undefined ? projects : await getAccessibleObjectsIDs(readableBy, PROJECT, projects, 'R', true)
//   } else {
//     /**
//      * If no streams and no projects given, then get public streams and user allowed permission streams
//      */
//     const filteredStreams = await streamDao.query({}, { permissableBy: readableBy })
//     conditions.push('s.is_public = true')
//     projectsAndStreamsConditions.push('d.stream_id = ANY($streams)')
//     bind.streams = filteredStreams.results.map(s => s.id)
//   }

//   if (classifiers) {
//     conditions.push('d.classifier_id = ANY($classifiers)')
//     bind.classifiers = classifiers
//   }

//   if (classifications) {
//     conditions.push('c.value = ANY($classifications)')
//     bind.classifications = classifications
//   }

//   if (minConfidence) {
//     conditions.push('d.confidence >= $minConfidence')
//     bind.minConfidence = minConfidence
//   }

//   if (isPositive) {
//     conditions.push('a.is_positive')
//   } else if (isPositive === false) {
//     conditions.push('NOT a.is_positive')
//   }

//   if (isReviewed) {
//     conditions.push('a.is_positive IS NOT null')
//   } else if (isReviewed === false) {
//     conditions.push('a.is_positive IS null')
//   }

//   return { conditions, projectsAndStreamsConditions, bind }
// }

// async function defaultQuery (filters, options) {
//   const { start, end, streams, projects, classifiers, classifications, minConfidence } = filters

//   const { conditions, projectsAndStreamsConditions, bind } = await getConditionsAndBind(options, start, end, streams, projects, classifiers, classifications, minConfidence)

//   /**
//    * If given both streams and project but don't have any items back, then return []
//    */
//   if ((streams && (!bind.streams || bind.streams.length === 0)) && (projects && (!bind.projects || bind.projects.length === 0))) {
//     return []
//   }

//   const baseConditions = conditions.join(' AND ')
//   const fullConditions = projectsAndStreamsConditions.length === 0 ? baseConditions : `${baseConditions} AND (${projectsAndStreamsConditions.join(' OR ')})`

//   const detectionsSql = `
//     SELECT d.start, d.end, d.confidence, d.stream_id "stream.id", (s.name) "stream.name", (s.project_id) "stream.project_id",
//     d.classifier_id "classifier.id", (clf.external_id) "classifier.external_id", (clf.name) "classifier.name", (clf.version) "classifier.version",
//     d.classification_id "classification.id", (c.value) "classification.value", (c.title) "classification.title",
//     (c.frequency_min) "classification.frequency_min", (c.frequency_max) "classification.frequency_max"
//     FROM detections d
//     JOIN streams s ON d.stream_id = s.id
//     JOIN classifications c ON d.classification_id = c.id
//     JOIN classifiers clf ON d.classifier_id = clf.id
//     WHERE ${fullConditions}
//     ORDER BY d.start
//     LIMIT $limit
//     OFFSET $offset
//   `

//   const detections = await models.sequelize.query(detectionsSql, { bind, nest: true, type: models.sequelize.QueryTypes.SELECT })

//   if (detections.length === 0) {
//     return []
//   }

//   const annotationBind = {
//     start: detections[0].start,
//     end: detections[detections.length - 1].start,
//     userId: options.userId
//   }

//   const annotationConditions = [
//     'a.start >= $start',
//     'a.start <= $end'
//   ]

//   if (classifications) {
//     annotationConditions.push('c.value = ANY($classifications)')
//     annotationBind.classifications = classifications
//   }

//   if (bind.streams && bind.streams.length > 0) {
//     annotationConditions.push('a.stream_id = ANY($streams)')
//     annotationBind.streams = bind.streams
//   }

//   const annotationsSql = `
//     SELECT a.start, a.end, a.classification_id, a.stream_id,
//     COUNT(1) total,
//     SUM(CASE WHEN a.is_positive THEN 1 ELSE 0 END) positive,
//     SUM(CASE WHEN a.created_by_id = $userId AND a.is_positive = true THEN 1 WHEN a.created_by_id = $userId AND a.is_positive = false THEN -1 ELSE 0 END) me
//     FROM annotations a
//     JOIN classifications c ON a.classification_id = c.id
//     WHERE ${annotationConditions.join(' AND ')}
//     GROUP BY a.start, a.end, a.classification_id, a.stream_id
//     ORDER BY a.start;
//   `
//   const annotations = await models.sequelize.query(annotationsSql, { bind: annotationBind, type: models.sequelize.QueryTypes.SELECT })

//   for (const d of detections) {
//     const matchAnnotation = annotations.find(a => {
//       const dStart = new Date(d.start)
//       const aStart = new Date(a.start)
//       return (dStart.toISOString() === aStart.toISOString()) && (d.classification.id === a.classification_id) && (d.stream.id === a.stream_id)
//     })

//     d.review = {
//       total: 0,
//       positive: 0,
//       me: null
//     }
//     if (matchAnnotation) {
//       d.review.total = Number(matchAnnotation.total)
//       d.review.positive = Number(matchAnnotation.positive)
//       const me = Number(matchAnnotation.me)
//       d.review.me = me === 0 ? null : me > 0
//     }
//   }

//   return detections
// }

// async function reviewQuery (filters, options) {
//   const { start, end, streams, projects, classifiers, classifications, minConfidence, isReviewed, isPositive } = filters

//   const { conditions, projectsAndStreamsConditions, bind } = await getConditionsAndBind(options, start, end, streams, projects, classifiers, classifications, minConfidence, isReviewed, isPositive)
//   bind.userId = options.userId

//   const baseConditions = conditions.join(' AND ')
//   const fullConditions = projectsAndStreamsConditions.length === 0 ? baseConditions : `${baseConditions} AND (${projectsAndStreamsConditions.join(' OR ')})`

//   const sql = `
//     SELECT d.start, d.end, d.confidence, d.stream_id "stream.id", (s.name) "stream.name", (s.project_id) "stream.project_id",
//     d.classifier_id "classifier.id", (clf.external_id) "classifier.external_id", (clf.name) "classifier.name", (clf.version) "classifier.version",
//     d.classification_id "classification.id", (c.value) "classification.value", (c.title) "classification.title",
//     (c.frequency_min) "classification.frequency_min", (c.frequency_max) "classification.frequency_max",
//     SUM(CASE WHEN a.is_positive IS NOT null THEN 1 ELSE 0 END) "review.total",
//     SUM(CASE WHEN a.is_positive THEN 1 ELSE 0 END) "review.positive",
//     SUM(CASE WHEN a.created_by_id = $userId AND a.is_positive = true THEN 1 WHEN a.created_by_id = $userId AND a.is_positive = false THEN -1 ELSE 0 END) "review.me"
//     FROM detections d
//     JOIN streams s ON d.stream_id = s.id
//     JOIN classifications c ON d.classification_id = c.id
//     JOIN classifiers clf ON d.classifier_id = clf.id
//     LEFT JOIN (
//       SELECT a.start, a.end, a.created_by_id , a.classification_id, a.stream_id, a.is_positive
//       FROM annotations a
//       WHERE a.start >= $start AND a.start < $end
//     ) as a ON d.stream_id = a.stream_id AND d.classification_id = a.classification_id AND d.start = a.start AND d.end = a.end
//     WHERE ${fullConditions}
//     GROUP BY d.start, d.end, d.classification_id, c.value, c.title, c.frequency_min, c.frequency_max,
//     d.classifier_id, clf.name, clf.version, clf.external_id, d.stream_id, s.name, s.project_id, d.confidence
//     LIMIT $limit
//     OFFSET $offset
//   `
//   const detections = await models.sequelize.query(sql, { bind, nest: true, type: models.sequelize.QueryTypes.SELECT })
//   detections.forEach(d => {
//     d.review.total = Number(d.review.total)
//     d.review.positive = Number(d.review.positive)
//     const me = Number(d.review.me)
//     d.review.me = me === 0 ? null : me > 0
//   })
//   return detections
// }

// /**
//  * Get a list of detections integrate with annotations
//  * @param {*} filters
//  * @param {string} filters.start
//  * @param {string} filters.end
//  * @param {string[] | undefined} filters.streams Stream id or list of stream ids
//  * @param {string[] | undefined} filters.projects Project id or list of project ids
//  * @param {string[] | undefined} filters.classifiers Classifier id or list of classifier ids
//  * @param {string[] | undefined} filters.classifications Classification or list of classifications
//  * @param {number} filters.minConfidence Minimum confidence to query detections
//  * @param {boolean} filters.isReviewed
//  * @param {boolean} filters.isPositive
//  * @param {*} options
//  * @param {number} options.limit Maximum number to get detections
//  * @param {number} options.offset Number of resuls to skip
//  * @param {number | undefined} options.readableBy Include detections readable to the given user id or include all if undefined
//  * @param { number } options.userId User id
//  * @returns {Detection[]} Detections
//  */
// async function query (filters, options) {
//   const { isReviewed, isPositive } = filters
//   if (isReviewed !== undefined || isPositive !== undefined) {
//     return await reviewQuery(filters, options)
//   }
//   return await defaultQuery(filters, options)
// }

// module.exports = {
//   query
// }
