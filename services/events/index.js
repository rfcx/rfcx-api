const models = require('../../modelsTimescale')

async function create (eventData) {
  return models.Event.create(eventData)
}

module.exports = { create }
