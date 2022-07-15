/**
 * Validate if query hours in the correct order
 * @param {string} rawQueryHours
 */
function validateQueryHours (rawQueryHours) {
  if (!rawQueryHours) {
    return true
  }

  const splittedQueryHours = rawQueryHours.split(',')
  return splittedQueryHours.every(hourString => {
    if (hourString.indexOf('-') !== -1) {
      const [stringNumber1, stringNumber2] = hourString.split('-')
      return Number(stringNumber1) < Number(stringNumber2)
    }
    return true
  })
}

module.exports = {
  validateQueryHours
}
