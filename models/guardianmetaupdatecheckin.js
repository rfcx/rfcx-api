'use strict';
module.exports = function(sequelize, DataTypes) {
  var GuardianMetaUpdateCheckIn = sequelize.define('GuardianMetaUpdateCheckIn', {

  }, {
    classMethods: {
      associate: function(models) {
        GuardianMetaUpdateCheckIn.belongsTo(models.Guardian, {as: 'Guardian'});
        GuardianMetaUpdateCheckIn.belongsTo(models.GuardianSoftware, {as: 'Version'});
      }
    },
    tableName: "GuardianMetaUpdateCheckIns"
  });
  return GuardianMetaUpdateCheckIn;
};