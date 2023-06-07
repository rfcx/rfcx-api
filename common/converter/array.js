const Conversion = require('./conversion')
const { ValidationError } = require('../error-handling/errors')
const { toCamelObject } = require('../../core/_utils/formatters/string-cases')

module.exports = class ArrayConverter {
  constructor (sourceArray, camelize) {
    this.sourceArray = sourceArray
    this.transformedArray = []
    this.conversions = []
    this.camelize = camelize || false
  }

  convert (property) {
    const conversion = new Conversion(null, property)
    this.conversions.push(conversion)
    return conversion
  }

  validate () {
    return new Promise((resolve, reject) => {
      const exceptions = []
      for (const item of this.sourceArray) {
        const target = item
        for (const conversion of this.conversions) {
          conversion.src = target
          conversion.target = target
          try {
            conversion.execute()
          } catch (e) {
            if (!exceptions.includes(e.message)) {
              exceptions.push(e.message)
            }
          }
        }
        this.transformedArray.push(target)
      }
      if (exceptions.length === 0) {
        resolve(this.camelize ? toCamelObject(this.transformedArray, 1) : this.transformedArray)
      } else {
        reject(new ValidationError(`Validation errors: ${exceptions.join('; ')}.`))
      }
    })
  }
}
