const moment = require('moment')

const dateKey = 'time_bucket'
const valueKey = 'aggregated_value'

function distribute (startTimestamp, endTimestamp, interval, groupInterval, data) {
  const startSecs = moment(startTimestamp).unix()
  const endSecs = moment(endTimestamp).unix()
  const intervalSecs = intervalToSeconds(interval)
  const groupSize = intervalToSeconds(groupInterval) / intervalSecs

  const distributed = []
  let currentSecs = startSecs
  for (let i = 0; i < data.length; i++) {
    const rowSecs = moment(data[i][dateKey]).unix()
    while (currentSecs < rowSecs) {
      distributed.push(-1)
      currentSecs += intervalSecs
    }
    distributed.push(data[i][valueKey])
    currentSecs += intervalSecs
  }
  while (currentSecs < endSecs) {
    distributed.push(-1)
    currentSecs += intervalSecs
  }

  const distributedAndGrouped = []
  while (distributed.length) distributedAndGrouped.push(distributed.splice(0, groupSize))

  return distributedAndGrouped
}

function intervalToSeconds (intervalString) {
  const unit = intervalString.slice(-1)
  const quantity = parseInt(intervalString.slice(0, -1))
  if (unit === 's') {
    return quantity
  }
  if (unit === 'm') {
    return quantity * 60
  }
  if (unit === 'h') {
    return quantity * 60 * 60
  }
  if (unit === 'd') {
    return quantity * 60 * 60 * 24
  }
  return undefined
}

module.exports = distribute
