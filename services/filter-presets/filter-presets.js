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

module.exports = {
  createFilterPreset,
  formatFilterPreset,
}
