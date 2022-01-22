const Conversion = require('./conversion')
const { ValidationError } = require('../error-handling/errors')
const { toCamelObject } = require('../../core/_utils/formatters/string-cases')

module.exports = class Converter {
  constructor (validatedObject, transformedObject, camelize) {
    if (validatedObject instanceof Converter) {
      validatedObject = validatedObject.validatedObject
    }
    this.validatedObject = validatedObject
    this.currentValue = null
    this.currentProperty = null
    this.transformedObject = transformedObject || {}
    this.conversions = []
    this.camelize = camelize || false
  }

  convert (property) {
    const conversion = new Conversion(this.validatedObject, property, this.transformedObject)
    this.conversions.push(conversion)
    return conversion
  }

  validate () {
    return Promise.resolve()
      .then(() => {
        const exceptions = []
        for (const conversion of this.conversions) {
          try {
            conversion.execute()
          } catch (e) {
            exceptions.push(e.message)
          }
        }
        if (exceptions.length === 0) {
          return this.camelize ? toCamelObject(this.transformedObject, 1) : this.transformedObject
        } else {
          throw new ValidationError(`Validation errors: ${exceptions.join('; ')}.`)
        }
      })
  }
}
