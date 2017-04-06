var Converter = require("../../utils/converter/converter");
var models = require("../../models");
var views = require("../../views/v1");

module.exports = {
  createCognitionType: function (params) {
    var transformedParams = {};
    params = new Converter(params, transformedParams);

    // required probability
    params.convert("event_type").toString();
    params.convert("event_value").toString();

    var res = {};


    return params.validate().then(() => {
      return models.GuardianAudioEventType.findOrCreate({
        where: {value: transformedParams.event_type}
      });
    }).spread(ev => {
      res.event_type = ev.value;
      res.event_type_id = ev.id;
    }).then(() => {
      return models.GuardianAudioEventValue.findOrCreate({
          where: {value: transformedParams.event_value}
      });
    }).spread(val => {
      res.event_value = val.value;
      res.event_value_id = val.id;
    }).then(() => {
      return res
    });
  }
};