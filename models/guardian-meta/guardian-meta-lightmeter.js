'use strict';
module.exports = function(sequelize, DataTypes) {
  var GuardianMetaLightMeter = sequelize.define('GuardianMetaLightMeter', {
    measured_at: {
      type: DataTypes.DATE(3),
      validate: {
        isDate: {
          msg: "measured_at for GuardianMetaLightMeter should have type Date"
        }
      }
    },
    luminosity: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true
      }
    }
  }, {
    tableName: "GuardianMetaLightMeter"
  });

  return GuardianMetaLightMeter;
};
