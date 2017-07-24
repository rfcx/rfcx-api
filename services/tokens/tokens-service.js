var models = require("../../models");
var sequelize = require("sequelize");
var Converter = require("../../utils/converter/converter");
var Promise = require("bluebird");
var util = require("util");

function findUserTokens(user) {
  return models.UserToken
    .findAll({ where: { user_id: user.id } });
}

function removeUserTokens(user) {
  return models.UserToken
    .destroy({ where: { user_id: user.id } });
}

module.exports = {
  findUserTokens: findUserTokens,
  removeUserTokens: removeUserTokens,
};
