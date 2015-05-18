'use strict';
module.exports = function(sequelize, DataTypes) {
  var GuardianMetaPower = sequelize.define('GuardianMetaPower', {
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
        GuardianMetaPower.belongsTo(models.Guardian, {as: 'Guardian'});
        GuardianMetaPower.belongsTo(models.GuardianCheckIn, {as: 'CheckIn'});
      }
    },
    tableName: "GuardianMetaPower"
  });
  return GuardianMetaPower;
};