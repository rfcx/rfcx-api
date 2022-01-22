const moment = require('moment')
const { ValidationError } = require('../../../common/error-handling/errors')

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

  // Convert string of confidences to array of floats e.g. [undefined, undefined, 0.987, undefined]
  const expandedConfidences = []
  confidences.split(',').forEach((val) => {
    if (val === '') {
      expandedConfidences.push(undefined)
    } else if (val.startsWith('n')) {
      const num = parseInt(val.substring(1)) // Guaranteed to be int due to regex
      expandedConfidences.push(...new Array(num).fill(undefined))
    } else {
      const confidence = parseFloat(val) // Guaranteed to be float due to regex
      expandedConfidences.push(confidence)
    }
  })

  // Convert array of confidences to array of objects with start/end
  return expandedConfidences.map((confidence, i) => {
    if (confidence === undefined) {
      return undefined
    }
    const start = moment(timestampMs + i * stepMs)
    const end = start.clone().add(stepMs, 'milliseconds')
    return { classification, classifier, start, end, confidence }
  }).filter((x) => x !== undefined)
}

module.exports = { parse }
