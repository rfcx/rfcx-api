function isObject (o) {
  return o === Object(o) && !Array.isArray(o) && typeof o !== 'function'
}

function toSnakeCase (str) {
  return str.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase()
}

function toSnakeObject (obj) {
  return Object.keys(typeof obj.toJSON === 'function' ? obj.toJSON() : obj)
    .reduce((acc, key) => ({
      ...acc,
      ...{ [toSnakeCase(key)]: obj[key] }
    }), {})
}

function toCamelCase (str) {
  return str.replace(/([-_][a-z])/ig, ($1) => {
    return $1.toUpperCase()
      .replace('-', '')
      .replace('_', '')
  })
}

function toCamelObject (o, maxLevels) {
  if (maxLevels === 0) {
    return o
  }
  if (isObject(o) && !(o instanceof Date)) {
    const n = {}
    Object.keys(o)
      .forEach((k) => {
        n[toCamelCase(k)] = toCamelObject(o[k], maxLevels ? maxLevels - 1 : undefined)
      })
    return n
  } else if (Array.isArray(o)) {
    return o.map((i) => {
      return toCamelObject(i, maxLevels)
    })
  }
  return o
}

module.exports = {
  toSnakeCase,
  toSnakeObject,
  toCamelCase,
  toCamelObject
}
