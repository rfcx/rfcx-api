const moment = require('moment')

const dateKey = 'time_bucket'
const valueKey = 'aggregated_value'

function distribute (startTimestamp, endTimestamp, interval, groupInterval, data) {
  const startSecs = moment.utc(startTimestamp).unix()
  const endSecs = moment.utc(endTimestamp).unix()
  const intervalSecs = intervalToSeconds(interval)
  const groupSize = intervalToSeconds(groupInterval) / intervalSecs

  const distributed = []
  let currentSecs = startSecs
  data.forEach(item => {
    const rowSecs = moment(item[dateKey]).unix()
    while (currentSecs < rowSecs) {
      distributed.push(-1)
      currentSecs += intervalSecs
    }
    distributed.push(item[valueKey])
    currentSecs += intervalSecs
  })
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
