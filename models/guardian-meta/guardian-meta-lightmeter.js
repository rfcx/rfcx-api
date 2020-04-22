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
    classMethods: {
      associate: function(models) {
        GuardianMetaLightMeter.belongsTo(models.Guardian, {as: 'Guardian'});
      }
    },
    tableName: "GuardianMetaLightMeter"
  });
  return GuardianMetaLightMeter;
};