const models = require('../../modelsTimescale')
const ValidationError = require('../../utils/converter/validation-error')

async function create (eventData) {
  return models.Event.create(eventData)
    .catch((e) => {
      console.error(e)
      throw new ValidationError('Cannot create event with provided data')
    })
}

module.exports = { create }
