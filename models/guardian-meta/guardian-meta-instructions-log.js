"use strict";

module.exports = function(sequelize, DataTypes) {
  var GuardianMetaInstructionsLog = sequelize.define("GuardianMetaInstructionsLog", {
    guid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4
    },
    queued_at: {
      type: DataTypes.DATE(3),
      allowNull: true,
      validate: {
        isDate: true
      }
    },
    executed_at: {
      type: DataTypes.DATE(3),
      allowNull: true,
      validate: {
        isDate: true
      }
    },
    response_json: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
      }
    },
    type: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
      }
    },
    command: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
      }
    },
    meta_json: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
      }
    },
    dispatch_attempts: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true,
        min: 0
      }
    },
    execution_attempts: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true,
        min: 0
      }
    },
    received_at: {
      type: DataTypes.DATE(3),
      allowNull: true,
      validate: {
        isDate: true
      }
    }
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
        GuardianMetaInstructionsLog.belongsTo(models.Guardian, {as: 'Guardian'});
      },
      indexes: [
        {
          unique: true,
          fields: ["guid"]
        }
      ]
    },
    tableName: "GuardianMetaInstructionsLog"
  });
  return GuardianMetaInstructionsLog;
};
