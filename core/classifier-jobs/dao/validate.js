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
      const [number1, number2] = hourString.split('-')
      console.log(number1, number2)
      return Number(number1) < Number(number2)
    }
    return true
  })
}

module.exports = {
  validateQueryHours
}
