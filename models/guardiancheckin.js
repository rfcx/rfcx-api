"use strict";

module.exports = function(sequelize, DataTypes) {
  var GuardianCheckIn = sequelize.define("GuardianCheckIn", {
    guid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      unique: true
    },
    measured_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: true,
      validate: {
        isDate: true
      }
    },
    internal_luminosity: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true,
        min: 0,
        max: 65536
      }
    },
    request_latency_api: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true,
        min: 0
      }
    },
    request_latency_guardian: {
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
        // associations can be defined here
        GuardianCheckIn.belongsTo(models.Guardian, {as: 'Guardian'});
        GuardianCheckIn.belongsTo(models.GuardianSoftware, {as: 'Version'});
      }
    }
  });

  return GuardianCheckIn;
};
