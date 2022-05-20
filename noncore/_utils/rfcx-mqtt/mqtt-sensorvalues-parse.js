const moment = require('moment')
const { ValidationError } = require('../../../common/error-handling/errors')

function parse (input) {
  const parseRegex = /(?<sensor>[a-zA-Z_]+)\*(?<epoch>[0-9]+)\*(?<rawvalues>([0-9]*\.[0-9]+)(\*[0-9]*\.[0-9]+)+)$/g
  const result = parseRegex.exec(input)
  if (result === null) {
    throw new ValidationError('Format not recognized')
  }

  const { sensor, epoch, rawvalues } = result.groups
  const timestamp = moment(parseInt(epoch))
  const values = rawvalues.split('*').map(x => parseFloat(x))
  return { sensor, timestamp, values }
}

module.exports = { parse }
