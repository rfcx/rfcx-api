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
    },
    guardian_skipped_checkins: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true,
        min: 0
      }
    },
    guardian_queued_checkins: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true,
        min: 0
      }
    },
    location_latitude: {
      type: DataTypes.FLOAT,
      allowNull: true,
      validate: {
        isFloat: true,
        min: -90,
        max: 90
      }
    },
    location_longitude: {
      type: DataTypes.FLOAT,
      allowNull: true,
      validate: {
        isFloat: true,
        min: -180,
        max: 180
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
