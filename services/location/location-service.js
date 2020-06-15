const models = require('../../modelsTimescale')
const EmptyResultError = require('../../utils/converter/empty-result-error')


function formatFull (annotation) {
  return models.Location.attributes.full.reduce((acc, attribute) => {
    acc[attribute] = annotation[attribute]
    return acc
  }, {})
}

function getById (id) {
  return models.Location
    .findOne({
      where: { id },
      attributes: models.Location.attributes.full
    })
    .then(item => {
      if (!item) {
        throw new EmptyResultError('Location with given id not found.')
      }
      return item
    })
    .catch(() => {
      // Function will throw "SequelizeDatabaseError" if id does not have uuid format
      // We need to rethrow error with "EmptyResultError" type for this method
      throw new EmptyResultError('Location with given id not found.');
    })
}

function create (location) {
  if (!location) {
    throw new ValidationError('Cannot create location row with empty object.')
  }
  const { name, description, latitude, longitude } = location; // do not use raw input object for security reasons
  return models.Location
    .create({ name, description, latitude, longitude })
    .then(formatFull)
}

module.exports = {
  getById,
  create,
}
