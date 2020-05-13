'use strict';
module.exports = function(sequelize, DataTypes) {
  var GuardianMetaReboot = sequelize.define('GuardianMetaReboot', {
    completed_at: {
      type: DataTypes.DATE(3),
      validate: {
        isDate: {
          msg: "completed_at for GuardianMetaReboot should have type Date"
        }
      }
    },
  }, {
    tableName: "GuardianMetaReboots"
  });

  return GuardianMetaReboot;
};
