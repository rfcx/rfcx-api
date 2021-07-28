const moment = require('moment')

/**
 * We round the time so that all times only have 0 or 500 miliseconds - our quantum of time
 * @returns {moment} quantified time
 */
function quantify (mom) {
  const miliseconds = mom.milliseconds()

  // first trident (like quadrant but for three segments? )
  if (miliseconds >= 0 && miliseconds < 250) {
    mom.milliseconds(0)
  }

  // second trident
  if (miliseconds >= 250 && miliseconds < 750) {
    mom.milliseconds(500)
  }

  // third trident
  if (miliseconds >= 750) {
    // setting miliseconds above 999 will add the appropriate secs to the date
    mom.milliseconds(1000)
    mom.milliseconds(0)
  }

  return mom
}

function momentToMysqlString (mom) {
  return mom.tz('UTC').format('YYYY-MM-DD HH:mm:ss.SSS')
}

function gluedDateStrToMoment (dateStr) {
  return moment(dateStr, 'YYYYMMDDTHHmmssSSSZ').utc()
}

function gluedDateStrOrEpochToMoment (dateStr) {
  return /^\d+$/.exec(dateStr) ? moment(parseInt(dateStr)) : gluedDateStrToMoment(dateStr)
}

function gluedDateStrToISO (dateStr) {
  return gluedDateStrToMoment(dateStr).toISOString()
}

module.exports = {
  quantify,
  momentToMysqlString,
  gluedDateStrToMoment,
  gluedDateStrOrEpochToMoment,
  gluedDateStrToISO
}
