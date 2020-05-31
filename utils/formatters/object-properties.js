function propertyToFloat (property) {
  return obj => ({ ...obj, [property]: parseFloat(obj[property]) })
}

module.exports = { propertyToFloat }