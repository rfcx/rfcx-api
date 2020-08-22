'use strict';
module.exports = function(sequelize, DataTypes) {
  var GuardianMetaSentinelPower = sequelize.define('GuardianMetaSentinelPower', {
    measured_at: {
      type: DataTypes.DATE(3),
      validate: {
        isDate: { msg: "measured_at for GuardianMetaSentinelPower should have type Date" }
      }
    },
    system_temperature: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true
      }
    },
    system_voltage: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true
      }
    },
    system_current: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true
      }
    },
    system_power: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true
      }
    },
    input_voltage: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true
      }
    },
    input_current: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true
      }
    },
    input_power: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true
      }
    },
    battery_voltage: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true
      }
    },
    battery_current: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true
      }
    },
    battery_power: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true
      }
    }
  }, {
    tableName: "GuardianMetaSentinelPower"
  });

  return GuardianMetaSentinelPower;
};
