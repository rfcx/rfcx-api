var Converter = require("../../utils/converter/converter");
var SensationsRepository = require("./sensations-repository");

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
    params.convert("latitude").toLatitude();
    params.convert("longitude").toLongitude();

    params.convert("begins_at").toQuantumTime();
    params.convert("ends_at").toQuantumTime();



    // validate will create a promise, if everything is fine the promise resolves and we can go on in then
    // if not the promise is rejected and the caller needs to deal with ValidationError
    return params.validate().then( args => {
      return new SensationsRepository().create(args);
    });
  }
};
