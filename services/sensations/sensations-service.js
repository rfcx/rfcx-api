var Converter = require("../../utils/converter/converter");
var SensationsRepository = require("./sensations-repository");
const ValidationError = require("../../utils/converter/validation-error");
var models  = require("../../models");
const guardian_source = 1;
const audio_data = 1;
const guardian_source_type = 1;
const moment = require("moment-timezone");

function createSensations(params) {
  params = new Converter(params);

  // this will convert the source type to integer but requires non-negative numbers
  // if source_type is not provided by the user, it will be set to 1
  params.convert("source_type").optional(1).toInt().minimum(0);

  // as this will happen often, you can also use
  params.convert("data_type").optional(1).toNonNegativeInt();

  // if you don't add optional(default), then it's a validation error if the user doesn't provide one
  params.convert("source_id").toNonNegativeInt();
  params.convert("data_id").optional(1).toNonNegativeInt();

  // this is will convert the property to a float and check if long/lat conforms to earth's max/min

  // Todo: Guardians should send GPS coords then this could be required fields
  params.convert("latitude").optional(1.0).toLatitude();
  params.convert("longitude").optional(1.0).toLongitude();

  params.convert("starting_after").toQuantumTime();
  params.convert("ending_before").toQuantumTime();

  // validate will create a promise, if everything is fine the promise resolves and we can go on in then
  // if not the promise is rejected and the caller needs to deal with ValidationError
  return params.validate().then( args => {
    return new SensationsRepository().create(args);
  });
}

function createSensationsFromGuardianAudio(audio_guid) {
  var params = {};

  return models.GuardianAudio.findOne({where: {guid: audio_guid}}).then(guardianAudio=>{
    params.starting_after = moment.tz(guardianAudio.measured_at.valueOf(), "UTC").toISOString();
    params.capture_sample_count = guardianAudio.capture_sample_count;
    params.source_id = guardianAudio.guardian_id;
    params.data_id = guardianAudio.id;
    return models.GuardianAudioFormat.findOne({where : {id: guardianAudio.format_id}});
  }).then(audioFormat => {
    var lengthInMs = Math.floor((params.capture_sample_count /  audioFormat.sample_rate) * 1000);
    var ending_before = moment.tz(params.starting_after, "UTC");
    ending_before.milliseconds(ending_before.milliseconds() + lengthInMs);
    params.ending_before = ending_before.toISOString();
    return models.Guardian.findOne({where: {id: params.source_id}});
  }).then(guardian => {
    params.source_type = guardian_source;
    params.latitude = guardian.latitude;
    params.longitude = guardian.longitude;
    return createSensations(params);
  });
}

function getSourceCoverage(serviceRequest){
  const params = {};
  const inputParams = new Converter(serviceRequest, params);
  const secondsIn31days = 60 * 60 * 24 * 31;
  inputParams.convert("source_id").toInt();
  inputParams.convert("source_type").toInt();
  inputParams.convert("starting_after").toMoment("UTC");
  inputParams.convert("ending_before").toMoment("UTC");
  inputParams.convert("interval").toInt().minimum(60).maximum(secondsIn31days);
  inputParams.convert("local_tz").optional("UTC").toString();
  return inputParams.validate().then( () => {
    const durationInSeconds = (params.before - params.after) / 1000;
    // not more than 35 days
    if(durationInSeconds > secondsIn31days) {
      throw new ValidationError("For performance reasons, you may not query for more than 35 days");
    }
  }).then(() =>{
    return new SensationsRepository().getCoverage(params).then( result =>{
      result.forEach(r => {
        r.time = moment.tz(r.time, "UTC").tz(params.local_tz).format("YYYY-MM-DD HH:mm:ss");
      });
      return result;
    });
  });

}

function getGuardianCoverage(serviceRequest){
  const params = {};
  const inputParams = new Converter(serviceRequest, params);

  inputParams.convert("guardian_id").toString();
  inputParams.convert("starting_after").toString();
  inputParams.convert("ending_before").toString();
  inputParams.convert("interval").toInt();

  return inputParams.validate().then(() => {
    return models.Guardian.findOne({where: {guid: params.guardian_id}});
  }).then(guardian =>{
    params.source_id = guardian.id;
    params.source_type = guardian_source_type;
    return models.GuardianSite.findOne({where: {id: guardian.site_id}});
  }).then(site => {
    if(! site.timezone) {
      console.log(`Site ${site.id} is missing the timezone, please add it!`);
      throw new Error("There's an error in the local time conversion of our database. Please contact the RFC admins. Thank you!");
    }
    params.starting_after = moment.tz(params.starting_after, site.timezone).tz("UTC").toISOString();
    params.ending_before = moment.tz(params.ending_before, site.timezone).tz("UTC").toISOString();
    params.local_tz = site.timezone;
    return getSourceCoverage(params);
  });

}

module.exports = {
  createSensations: createSensations,
  createSensationsFromGuardianAudio: createSensationsFromGuardianAudio ,
  getSourceCoverage: getSourceCoverage,
  getGuardianCoverage: getGuardianCoverage
};
