var Promise = require('bluebird')

function getAiModelByGuid (guid, ignoreMissing) {
  // TODO: replace with commented code when DB part will be ready;
  return Promise.resolve({
    guid: 'test'
  })
}

module.exports = {
  getAiModelByGuid
}
