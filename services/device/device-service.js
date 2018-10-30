var models = require("../../models");
var sequelize = require("sequelize");
var Converter = require("../../utils/converter/converter");
var Promise = require("bluebird");
const util = require('util');
const hash = require('../../utils/misc/hash').hash;
const guid = require('../../utils/misc/guid');

// function registerDevice(data) {
//   findDeviceByFirebaseToken(data.token)
//     .then((dbDevice) => {
//       if (dbDevice) {
//         return dbDevice;
//       }
//       else {
//         return createDevice(data)
//       }
//     })
// }

// function findDeviceByFirebaseToken(firebaseToken) {
//   return models.Device
//     .findOne({
//       where: { firebaseToken }
//     });
// }

module.exports = {
  // registerDevice,
};
