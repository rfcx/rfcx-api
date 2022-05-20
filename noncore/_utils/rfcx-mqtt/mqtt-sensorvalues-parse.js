const moment = require('moment')
const { ValidationError } = require('../../../common/error-handling/errors')

function parse (input) {
  const parseRegex = /(?<sensorname>[a-zA-Z_]+)\*(?<timestamp>[0-9]+)\*(?<values>([0-9]*\.[0-9]+)?((,|n[0-9]+)([0-9]*\.[0-9]+)?)+)$/g
  const result = parseRegex.exec(input)
  if (result === null) {
    throw new ValidationError('Format not recognized')
  }

  return []
}

module.exports = { parse }
