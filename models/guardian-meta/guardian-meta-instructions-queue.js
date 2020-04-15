"use strict";

module.exports = function(sequelize, DataTypes) {
  var GuardianMetaInstructionsQueue = sequelize.define("GuardianMetaInstructionsQueue", {
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
    execute_at: {
      type: DataTypes.DATE(3),
      allowNull: true,
      validate: {
        isDate: true
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
        GuardianMetaInstructionsQueue.belongsTo(models.Guardian, {as: 'Guardian'});
      },
      indexes: [
        {
          unique: true,
          fields: ["guid"]
        }
      ]
    },
    tableName: "GuardianMetaInstructionsQueue"
  });
  return GuardianMetaInstructionsQueue;
};
