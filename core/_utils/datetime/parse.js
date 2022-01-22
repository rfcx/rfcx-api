const moment = require('moment')

function gluedDateStrToMoment (dateStr) {
  return moment(dateStr, 'YYYYMMDDTHHmmssSSSZ').utc()
}

function gluedDateStrOrEpochToMoment (dateStr) {
  return /^\d+$/.exec(dateStr) ? moment(parseInt(dateStr)) : gluedDateStrToMoment(dateStr)
}

module.exports = {
  gluedDateStrToMoment,
  gluedDateStrOrEpochToMoment
}
