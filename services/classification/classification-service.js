const Promise = require("bluebird");
const models = require("../../models");
const ForbiddenError = require("../../utils/converter/forbidden-error");
const ValidationError = require('../../utils/converter/validation-error');
const EmptyResultError = require('../../utils/converter/empty-result-error');

function getClassificationByValue(value, ignoreMissing) {
  return models.Classification
    .findOne({
      where: { value },
      include: [{ all: true }],
    })
    .then((item) => {
      if (!item && !ignoreMissing) { throw new EmptyResultError('Classification with given value not found.'); }
      return item;
    });
}

module.exports = {
  getClassificationByValue,
};
