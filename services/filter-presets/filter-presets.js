var sequelize = require("sequelize");
var Converter = require("../../utils/converter/converter");
const ValidationError = require("../../utils/converter/validation-error");
var models  = require("../../models");
var sequelize = require("sequelize");
var Promise = require("bluebird");

function validateCreateParams(params) {
  params = new Converter(params);

  params.convert('json').objToString();
  params.convert('type').optional().toString();
  params.convert('created_by').toNonNegativeInt();
  params.convert('updated_by').toNonNegativeInt();

  return params.validate();
}

function validateUpdateParams(params) {
  params = new Converter(params);

  params.convert('json').objToString();
  params.convert('updated_by').toNonNegativeInt();

  return params.validate();
}

function formatFilterPreset(filterPreset) {
  return {
    type: filterPreset.type,
    json: JSON.parse(filterPreset.json),
  };
}

function createFilterPreset(params) {
  return validateCreateParams(params)
    .then(data => {
      return models.FilterPreset.create(data);
    });
}

function getFilterPresetByGuid(guid) {
  return models.FilterPreset
    .findOne({
      where: { guid: guid },
      include: [{ all: true }]
    })
    .then((filterPreset) => {
      if (!filterPreset) {
        throw new sequelize.EmptyResultError('Filter Preset with given guid not found.');
      }
      return filterPreset;
    });
}

function updateFilterPreset(filterPreset, params) {
  return validateUpdateParams(params)
    .then(data => {
      return filterPreset.update(data);
    })
    .then(() => {
      return filterPreset.reload();
    })
}

module.exports = {
  createFilterPreset,
  formatFilterPreset,
  getFilterPresetByGuid,
  updateFilterPreset,
}
