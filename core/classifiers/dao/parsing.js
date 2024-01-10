const { ValidationError } = require('../../../common/error-handling/errors')

module.exports = {
  parseClassifierOutputMapping (str) {
    // matching from:to:0.5
    const regex = /^([a-zA-Z]+)(?::([a-zA-Z]+))?(?::([\d.]+))?$/g
    const components = regex.exec(str)
    if (!components) {
      return new ValidationError('classification_values is invalid format')
    }
    return { from: components[1], to: components[2] ?? components[1], threshold: components[3] ?? 0.5 }
  }
}
