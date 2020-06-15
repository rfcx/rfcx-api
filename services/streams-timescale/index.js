const models = require('../../modelsTimescale')
const EmptyResultError = require('../../utils/converter/empty-result-error')
const ValidationError = require('../../utils/converter/validation-error')

function create(stream) {
  if (!stream) {
    throw new ValidationError('Cannot create stream row with empty object.')
  }
  const { id, name, description, start, end, is_private, location_id, created_by_id } = stream; // do not use raw input object for security reasons
  return models.Stream
    .create({ id, name, description, start, end, is_private, location_id, created_by_id })
    .then(item => models.utils.formatModeiItem(models.Stream, item, 'lite'))
}

module.exports = {
  create,
}
