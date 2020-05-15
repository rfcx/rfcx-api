'use strict';
module.exports = function(sequelize, DataTypes) {
  var GuardianMetaUpdateCheckIn = sequelize.define('GuardianMetaUpdateCheckIn', {

  }, {
    tableName: "GuardianMetaUpdateCheckIns"
  });

  return GuardianMetaUpdateCheckIn;
};
