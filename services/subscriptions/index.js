const { Organization, Project, Stream, User, UserProjectSubscription } = require('../../modelsTimescale')
const subscriptionTypes = require('./subscription-types')
const EmptyResultError = require('../../utils/converter/empty-result-error')
const ValidaionError = require('../../utils/converter/validation-error')

const subscriptionModels = {
  organization: null, // not yet implemented
  project: UserProjectSubscription,
  stream: null // not yet implemented
}

const subscriptionIncludes = {
  organization: [
    User.include(),
    Organization.include()
  ],
  project: [
    User.include(),
    Project.include()
  ],
  stream: [
    User.include(),
    Stream.include()
  ]
}

function _getModel (name) {
  const model = subscriptionModels[name]
  if (!model) {
    throw new ValidaionError('Not implemented')
  }
  const columnName = `${name}_id`
  return { model, columnName }
}

/**
 * Searches for subscription type with given name
 * @param {string} q Id or Name
 * @returns {*} Subscription type item
 */
function getTypeByIdOrName (q) {
  q = `${q}`.toLowerCase()
  const item = subscriptionTypes.find((type) => {
    return `${type.id}` === q || type.name.toLowerCase() === q
  })
  if (!item) {
    throw new EmptyResultError('Subscription type with given parameter not found.')
  }
  return item
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
    include: subscriptionIncludes[itemModelName]
  })
    .then((items) => {
      return items.map((item) => {
        const subscriptionType = getTypeByIdOrName(item.subscription_type_id)
        const { id, name } = subscriptionType
        return {
          user: item.user,
          [itemModelName]: item[itemModelName],
          subscription_type: { id, name }
        }
      })
    })
}

module.exports = {
  getTypeByIdOrName,
  addSubscription,
  removeSubscription,
  query
}
