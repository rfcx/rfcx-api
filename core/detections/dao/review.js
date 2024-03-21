const { ForbiddenError } = require('../../../common/error-handling/errors')
const { DetectionReview, Sequelize } = require('../../_models')
const Op = Sequelize.Op

const REVIEW_STATUS_MAPPING = {
  rejected: -1,
  uncertain: 0,
  confirmed: 1,
  unreviewed: null
}

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

module.exports = { create, query, update, REVIEW_STATUS_MAPPING }
