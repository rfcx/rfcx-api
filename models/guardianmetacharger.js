'use strict';
module.exports = function(sequelize, DataTypes) {
  var GuardianMetaCharger = sequelize.define('GuardianMetaCharger', {
    measured_at: {
      type: DataTypes.DATE,
      validate: {
        isDate: true
      }
    },
    is_powered: {
      type: DataTypes.BOOLEAN
    },
    is_charged: {
      type: DataTypes.BOOLEAN
    },
  }, {
    classMethods: {
      associate: function(models) {
        GuardianMetaCharger.belongsTo(models.Guardian, {as: 'Guardian'});
        GuardianMetaCharger.belongsTo(models.GuardianCheckIn, {as: 'CheckIn'});
      }
    },
    tableName: "GuardianMetaCharger"
  });
  return GuardianMetaCharger;
};