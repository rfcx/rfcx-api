var sequelize = require("sequelize");
var Converter = require("../../utils/converter/converter");
const ValidationError = require("../../utils/converter/validation-error");
var models  = require("../../models");
const userService = require('../users/users-service');

function getTypeByName(name) {
  return models.MessageType
    .findOne({
      where: { name: name }
    })
    .then((type) => {
      if (!type) {
        throw new sequelize.EmptyResultError('Message Type with given name not found.');
      }
      return type;
    });
}

function validateParams(params) {
  params = new Converter(params);

  params.convert('text').optional().toString();
  params.convert('time').toQuantumTime();
  params.convert('type').toNonNegativeInt();
  params.convert('latitude').optional().toLatitude();
  params.convert('longitude').optional().toLongitude();
  params.convert('from_user').toNonNegativeInt();
  params.convert('to_user').optional().toNonNegativeInt();

  return params.validate();
}

function formatMessage(message) {
  return getMessageByGuid(message.guid)
    .then((messageObj) => {
      var obj = {
        guid: messageObj.guid,
        time: messageObj.time,
        text: messageObj.text,
        type: messageObj.Type.name,
        from: userService.formatUser(messageObj.UserFrom),
        to: messageObj.UserTo? userService.formatUser(messageObj.UserTo) : null,
        coords: null
      }
      if (messageObj.latitude && messageObj.longitude) {
        obj.coords = {
          lat: messageObj.latitude,
          lon: messageObj.longitude
        };
      }
      return obj;
    });
}

function getMessageByGuid(guid) {
  return models.Message
    .findOne({
      where: { guid: guid },
      include: [{ all: true }]
    });
}

function createMessage(params) {
  return validateParams(params)
    .then(data => {
      return models.Message.create(data);
    });
}

module.exports = {
  getTypeByName: getTypeByName,
  createMessage: createMessage,
  formatMessage: formatMessage,
  getMessageByGuid: getMessageByGuid
}
