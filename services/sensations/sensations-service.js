var Converter = require("../../utils/converter/converter");
var SensationsRepository = require("./sensations-repository");
var models  = require("../../models");
const guardian_source = 1;
const audio_data = 1;

module.exports = {
  createSensations: function (params) {
    params = new Converter(params);

    // this will convert the source type to integer but requires non-negative numbers
    // if source_type is not provided by the user, it will be set to 1
    params.convert("source_type").optional(1).toInt().minimum(0);

    // as this will happen often, you can also use
    params.convert("data_type").optional(1).toNonNegativeInt();

    // if you don't add optional(default), then it's a validation error if the user doesn't provide one
    params.convert("source_id").toNonNegativeInt();
    params.convert("data_id").toNonNegativeInt();

    // this is will convert the property to a float and check if long/lat conforms to earth's max/min

    // Todo: Guardians should send GPS coords then this could be required fields
    params.convert("latitude").optional(1.0).toLatitude();
    params.convert("longitude").optional(1.0).toLongitude();

    params.convert("begins_at").toQuantumTime();
    params.convert("ends_at").toQuantumTime();



    // validate will create a promise, if everything is fine the promise resolves and we can go on in then
    // if not the promise is rejected and the caller needs to deal with ValidationError
    return params.validate().then( args => {
      return new SensationsRepository().create(args);
    });
  },
  createSensationsFromGuardianAudio(audio_guid) {
    var params = {};

    return models.GuardianAudio.findOne({where: {guid: audio_guid}}).then(guardianAudio=>{
      params.begins_at = guardianAudio.measured_at;
      params.capture_sample_count = guardianAudio.capture_sample_count;
      params.source_id = guardianAudio.guardian_id;
      params.data_id = guardianAudio.id;
      return models.GuardianAudioFormat.findOne({where : {id: guardianAudio.format_id}});
    }).then(audioFormat => {
      var lengthInMs = Math.floor((params.capture_sample_count /  audioFormat.sample_rate) * 1000);
      var ends_at = new Date(params.begins_at.valueOf());
      ends_at.setMilliseconds(ends_at.getMilliseconds() + lengthInMs);
      params.ends_at = ends_at;
      return models.Guardian.findOne({where: {id: params.source_id}});
    }).then(guardian => {
      params.source_type = guardian_source;
      params.latitude = guardian.latitude;
      params.longitude = guardian.longitude;
      return this.createSensations(params);
    });


  }
};
