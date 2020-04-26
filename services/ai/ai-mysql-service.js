var Promise = require("bluebird");
var ValidationError = require('../../utils/converter/validation-error');
var EmptyResultError = require('../../utils/converter/empty-result-error');

function getAiModelByGuid(guid, ignoreMissing) {
  // TODO: replace with commented code when DB part will be ready;
  return Promise.resolve({
    guid: 'test'
  });
  // return models.AiModel
  //   .findOne({
  //     where: { guid },
  //     include: [{ all: true }],
  //   })
  //   .then((item) => {
  //     if (!item && !ignoreMissing) { throw new EmptyResultError('AiModel with given guid not found.'); }
  //     return item;
  //   });
}

module.exports = {
  getAiModelByGuid,
};
