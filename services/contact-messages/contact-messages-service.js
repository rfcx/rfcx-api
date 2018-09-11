var Converter = require("../../utils/converter/converter");
var models  = require("../../models");

function validateCreateParams(params) {
  params = new Converter(params);

  params.convert('email').toString();
  params.convert('subject').toString();
  params.convert('message').toString();

  return params.validate();
}

function createMessage(params) {
  return validateCreateParams(params)
    .then(data => {
      data.message = escapeReturns(data.message);
      return models.ContactMessage.create(data);
    });
}

function escapeReturns(message) {
  return message.replace(/[\n\r]/g, ' ');
}

module.exports = {
  createMessage
}
