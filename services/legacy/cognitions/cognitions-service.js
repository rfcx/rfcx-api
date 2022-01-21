const Converter = require('../../../utils/converter/converter')
const models = require('../../../models-legacy')
const Promise = require('bluebird')

module.exports = {
  createCognitionTypeValue: function (params) {
    return Promise.all([
      this.createCognitionType(params),
      this.createCognitionValue(params)
    ])
      .spread((type, value) => {
        return Object.assign({}, type, value)
      })
  },

  createCognitionType: function (params) {
    const transformedParams = {}
    params = new Converter(params, transformedParams)
    params.convert('event_type').toString()

    return params.validate().then(() => {
      return models.GuardianAudioEventType.findOrCreate({
        where: { value: transformedParams.event_type }
      })
    }).spread(ev => {
      return {
        event_type: ev.value,
        event_type_id: ev.id
      }
    })
  },

  createCognitionValue: function (params) {
    const transformedParams = {}
    params = new Converter(params, transformedParams)
    params.convert('event_value').toString()

    return params.validate().then(() => {
      return models.GuardianAudioEventValue.findOrCreate({
        where: { value: transformedParams.event_value }
      })
    }).spread(val => {
      return {
        event_value: val.value,
        event_value_id: val.id
      }
    })
  }
}
