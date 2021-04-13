const moment = require('moment')
const ValidationError = require('../converter/validation-error')

function parse (input) {
  const parseRegex = /(?<classification>[a-zA-Z_]+)\*(?<classifier>[a-zA-Z0-9_-]+)\*(?<timestamp>[0-9]+)\*(?<step>[0-9]+)\*(?<confidences>([0-9]*\.[0-9]+)?(,([0-9]*\.[0-9]+)?)+)$/g
  const result = parseRegex.exec(input)

  if (result === null) {
    throw new ValidationError('Format not recognized')
  }

  const { classification, classifier, confidences } = result.groups
  const timestampMs = parseInt(result.groups.timestamp)
  const stepMs = parseInt(result.groups.step)

  return confidences.split(',').map((x, i) => {
    if (x === '') return undefined
    const start = moment(timestampMs + i * stepMs)
    const end = start.clone().add(stepMs, 'milliseconds')
    const confidence = parseFloat(x)
    return { classification, classifier, start, end, confidence }
  }).filter((x) => x !== undefined)
}

module.exports = { parse }
