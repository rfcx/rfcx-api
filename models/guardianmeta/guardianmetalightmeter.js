'use strict';
module.exports = function(sequelize, DataTypes) {
  var GuardianMetaLightMeter = sequelize.define('GuardianMetaLightMeter', {
    measured_at: {
      type: DataTypes.DATE,
      validate: {
        isDate: true
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