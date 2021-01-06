const {
  SubscriptionType,
  UserProjectSubscription,
  Project,
  User,
  Sequelize
} = require('../../modelsTimescale')
const EmptyResultError = require('../../utils/converter/empty-result-error')
const ValidaionError = require('../../utils/converter/validation-error')

const subscriptionModels = {
  organization: null, // not yet implemented
  project: UserProjectSubscription,
  stream: null // not yet implemented
}

const subscriptionInclude = [
  {
    model: User,
    as: 'user',
    attributes: User.attributes.lite
  },
  {
    model: Project,
    as: 'project',
    attributes: Project.attributes.lite
  },
  {
    model: SubscriptionType,
    as: 'subscription_type',
    attributes: SubscriptionType.attributes.lite
  }
]

function _getModel (name) {
  const model = subscriptionModels[name]
  if (!model) {
    throw new ValidaionError('Not implemented')
  }
  const columnName = `${name}_id`
  return { model, columnName }
}

/**
 * Searches for role model with given name
 * @param {string} q Id or Name
 * @param {*} opts additional function params
 * @returns {*} Subscription type model item
 */
function getTypeByIdOrName (q) {
  return SubscriptionType
    .findOne({
      where: {
        [Sequelize.Op.or]: {
          ...!isNaN(parseInt(q)) && { id: parseInt(q) },
          name: q
        }
      },
      attributes: SubscriptionType.attributes.full
    })
    .then(item => {
      if (!item) {
        throw new EmptyResultError('Subscription type with given parameter not found.')
      }
      return item
    })
}

/**
 * Adds specified subscription to item for user. If already exists - does nothing.
 * @param {string} userId user id
 * @param {string} subscriptionTypeId subscription type id
 * @param {string} itemId item id
 * @param {string} itemModelName item model name (e.g. stream, project, organization)
 */
function addSubscription (userId, subscriptionTypeId, itemId, itemModelName) {
  const { model, columnName } = _getModel(itemModelName)
  const where = {
    user_id: userId,
    subscription_type_id: subscriptionTypeId,
    [columnName]: itemId
  }
  return model.findOrCreate({ where })
    .spread((item, created) => {
      return item
    })
}

/**
 * Removes user subscription for specified item.
 * If subscriptionTypeId is null, removes all subscriptions for specified user and item
 * If itemId is null, removes all subscriptions for specified user and item type (e.g. all projects)
 * @param {string} userId user id
 * @param {string} subscriptionTypeId subscription type id or null
 * @param {string} itemId item id
 * @param {string} itemModelName item model name (e.g. stream, project, organization)
 */
function removeSubscription (userId, subscriptionTypeId, itemId, itemModelName) {
  const { model, columnName } = _getModel(itemModelName)
  const where = {
    user_id: userId,
    ...itemId && { [columnName]: itemId },
    ...subscriptionTypeId && { subscription_type_id: subscriptionTypeId } // if sub id is not specified, remove all subs
  }
  return model.destroy({ where })
}

/**
 * Returns list of subscriptions for specified user and item.
 * If subscriptionTypeId is null, removes all subscriptions for specified user and item
 * @param {string} userId user id
 * @param {string} itemId item id
 * @param {string} itemModelName item model name (e.g. stream, project, organization)
 */
function query (userId, itemId, itemModelName) {
  const { model, columnName } = _getModel(itemModelName)
  return model.findAll({
    where: {
      user_id: userId,
      ...itemId && { [columnName]: itemId }
    },
    include: subscriptionInclude
  })
    .then((items) => {
      return items.map((item) => {
        const { user, project, subscription_type } = item // eslint-disable-line camelcase
        return { user, project, subscription_type }
      })
    })
}

module.exports = {
  getTypeByIdOrName,
  addSubscription,
  removeSubscription,
  query
}
