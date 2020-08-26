
function toSnakeCase (str) {
  return str.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase()
}

function isObject (o) {
  return o === Object(o) && !Array.isArray(o) && typeof o !== 'function'
}

function toSnakeObject (obj) {
  return Object.keys(typeof obj.toJSON === 'function' ? obj.toJSON() : obj)
    .reduce((acc, key) => ({
      ...acc,
      ...{ [toSnakeCase(key)]: obj[key] }
    }), {})
}

module.exports = {
  toSnakeCase,
  isObject,
  toSnakeObject
}
