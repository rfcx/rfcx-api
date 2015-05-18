'use strict';
module.exports = function(sequelize, DataTypes) {
  var GuardianMetaBattery = sequelize.define('GuardianMetaBattery', {
    measured_at: {
      type: DataTypes.DATE,
      validate: {
        isDate: true
      }
    },
    battery_percent: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true,
        min: 0
      }
    },
    battery_temperature: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true,
        min: 0
      }
    }
  }, {
    classMethods: {
      associate: function(models) {
        GuardianMetaBattery.belongsTo(models.Guardian, {as: 'Guardian'});
        GuardianMetaBattery.belongsTo(models.GuardianCheckIn, {as: 'CheckIn'});
      }
    },
    tableName: "GuardianMetaBattery"
  });
  return GuardianMetaBattery;
};