const moment = require('moment')
const ValidationError = require('../converter/validation-error')

function parse (input) {
  const parseRegex = /(?<classification>[a-zA-Z_]+)\*(?<classifier>[a-zA-Z0-9_-]+)\*(?<timestamp>[0-9]+)\*(?<step>[0-9]+)\*(?<confidences>([0-9]*\.[0-9]+)?((,|n[0-9]+)([0-9]*\.[0-9]+)?)+)$/g
  const result = parseRegex.exec(input)
  if (result === null) {
    throw new ValidationError('Format not recognized')
  }

  const { classification, classifier, confidences } = result.groups
  const timestampMs = parseInt(result.groups.timestamp)
  let stepMs = parseInt(result.groups.step)
  // First round of satellite guardians have incorrect step
  if (stepMs > 100000) {
    stepMs = stepMs / 1000
  }

  if (confidences.includes('n')) {
    let realIndexOfConfidence = 0
    return confidences.split(',').map((x) => {
      if (x[0] === 'n') {
        realIndexOfConfidence += parseInt(x.substring(1))
        return undefined
      }
      const start = moment(timestampMs + realIndexOfConfidence * stepMs)
      const end = start.clone().add(stepMs, 'milliseconds')
      const confidence = parseFloat(x)
      realIndexOfConfidence++
      return { classification, classifier, start, end, confidence }
    }).filter((x) => x !== undefined)
  } else {
    return confidences.split(',').map((x, i) => {
      if (x === '') {
        return undefined
      }
      const start = moment(timestampMs + i * stepMs)
      const end = start.clone().add(stepMs, 'milliseconds')
      const confidence = parseFloat(x)
      return { classification, classifier, start, end, confidence }
    }).filter((x) => x !== undefined)
  }
}

module.exports = { parse }
