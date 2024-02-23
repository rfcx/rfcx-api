const urls = require('../_utils/misc/urls')

const SequelizeApiConverter = function (type, req, selfProperty) {
  const converter = this

  converter.type = type
  converter.collection = type.replace(/([A-Z])/g, function (m) { return 's/' + m.toLowerCase() }) + 's'
  converter.baseUrl = urls.getApiUrl(req)
  converter.selfProp = selfProperty == null ? 'id' : selfProperty

  function fromCamel (cameledName) {
    // Todo think about names starting with a capital letter
    return cameledName.replace(/([A-Z])/g, function (m) { return '_' + m.toLowerCase() })
  }

  function toCamel (uncameledName) {
    return uncameledName.replace(/_([a-z])/g, function (m) { return m[1].toUpperCase() })
  }

  function identityTransform (key) {
    return key
  }

  function createApiObj (id, attrs) {
    const api = {
      data: {
        id,
        type: converter.type,
        attributes: attrs || {}
      },
      links: {
        self: converter.baseUrl + '/' + converter.collection + '/'
      }
    }

    return api
  }

  function mapToApiWithTransformation (obj, transform) {
    if (transform == null) {
      transform = identityTransform
    }
    if ('dataValues' in obj) {
      // we are accessing a sequelized object
      obj = obj.dataValues
    }
    const id = obj.guid
    const api = createApiObj(id)
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) { // eslint-disable-line no-prototype-builtins
        if (key === 'id' || key === 'updated_at' || key === 'created_at' || key === 'guid') {
          continue
        }

        if ((obj[key] === Object(obj[key])) && ('dataValues' in obj[key])) {
          continue
        }
        const transformedKey = transform(key)
        api.data.attributes[transformedKey] = obj[key]
      }
    }
    api.links.self += converter.selfProp in api.data.attributes ? api.data.attributes[converter.selfProp] : id
    return api
  }

  function mapSequelizeToApi (obj) {
    return mapToApiWithTransformation(obj, toCamel)
  }

  function cloneSequelizeToApi (attrs) {
    const obj = createApiObj(null, attrs)
    delete obj.data.id
    return obj
  }

  function mapToPojoWithTransformation (obj, transform) {
    if (transform == null) {
      transform = identityTransform
    }
    const db = {}

    db.guid = obj.data.id
    db.type = obj.data.type

    for (const key in obj.data.attributes) {
      if (obj.data.attributes.hasOwnProperty(key)) { // eslint-disable-line no-prototype-builtins
        const transformedKey = transform(key)
        db[transformedKey] = obj.data.attributes[key]
      }
    }

    return db
  }

  /**
     * Convert camelCase object attributes to underscore format and prepare data for db
     */
  function mapApiToSequelize (obj) {
    return mapToPojoWithTransformation(obj, fromCamel)
  }

  converter.mapApiToPojo = mapToPojoWithTransformation
  converter.mapPojoToApi = mapToApiWithTransformation
  converter.mapSequelizeToApi = mapSequelizeToApi
  converter.mapApiToSequelize = mapApiToSequelize
  converter.cloneSequelizeToApi = cloneSequelizeToApi
}

module.exports = SequelizeApiConverter
