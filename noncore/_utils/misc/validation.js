function findMissingAttributes (obj, attributes) {
  const missing = []

  for (let i = 0; i < attributes.length; i++) {
    const attr = attributes[i]
    if (!Object.prototype.hasOwnProperty.call(obj, attr)) {
      missing.push(attr)
    }
  }
  return missing
}

const validation = {

  assertAttributesExist: function (obj, attributes) {
    const missing = findMissingAttributes(obj, attributes)

    if (missing.length > 0) {
      let msg = 'Please provide the following attributes: '
      msg += missing.join(', ')
      throw new Error(msg)
    }
  }
}

module.exports = validation
