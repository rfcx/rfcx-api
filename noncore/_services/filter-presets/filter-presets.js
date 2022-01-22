const sequelize = require('sequelize')
const Converter = require('../../../common/converter')
const models = require('../../_models')
const userService = require('../../../common/users/users-service-legacy')

function validateCreateParams (params) {
  params = new Converter(params)

  params.convert('name').toString()
  params.convert('type').optional().toString()
  params.convert('json').objToString()
  params.convert('created_by').toNonNegativeInt()
  params.convert('updated_by').toNonNegativeInt()

  return params.validate()
}

function validateUpdateParams (params) {
  params = new Converter(params)

  params.convert('json').objToString()
  params.convert('updated_by').toNonNegativeInt()

  return params.validate()
}

function formatFilterPreset (filterPreset) {
  return {
    guid: filterPreset.guid,
    name: filterPreset.name,
    type: filterPreset.type,
    json: JSON.parse(filterPreset.json),
    userCreated: userService.formatUser(filterPreset.UserCreated, true),
    userUpdated: userService.formatUser(filterPreset.UserUpdated, true)
  }
}

function createFilterPreset (params) {
  return validateCreateParams(params)
    .then(data => {
      return models.FilterPreset.create(data)
    })
    .then((filterPreset) => {
      return filterPreset.reload({
        include: [{ all: true }]
      })
    })
}

function doesNameExist (name) {
  return models.FilterPreset
    .findOne({
      where: { name: name }
    })
    .then((filterPreset) => {
      return !!filterPreset
    })
}

function getFilterPresetByGuid (guid) {
  return models.FilterPreset
    .findOne({
      where: { guid: guid },
      include: [{ all: true }]
    })
    .then((filterPreset) => {
      if (!filterPreset) {
        throw new sequelize.EmptyResultError('Filter Preset with given guid not found.')
      }
      return filterPreset
    })
}

function getFilterPresets (params) {
  const opts = {}
  if (params.types) {
    opts.type = {
      [models.Sequelize.Op.in]: params.types
    }
  }
  return models.FilterPreset
    .findAll({
      where: opts,
      include: [{ all: true }]
    })
}

function updateFilterPreset (filterPreset, params) {
  return validateUpdateParams(params)
    .then(data => {
      return filterPreset.update(data)
    })
    .then(() => {
      return filterPreset.reload({
        include: [{ all: true }]
      })
    })
}

module.exports = {
  createFilterPreset,
  formatFilterPreset,
  getFilterPresetByGuid,
  getFilterPresets,
  updateFilterPreset,
  doesNameExist
}
