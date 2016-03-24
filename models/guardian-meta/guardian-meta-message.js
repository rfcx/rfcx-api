"use strict";

module.exports = function(sequelize, DataTypes) {
  var GuardianMetaMessage = sequelize.define("GuardianMetaMessage", {
    guid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4
    },
    received_at: {
      type: DataTypes.DATE(3),
      allowNull: true,
      validate: {
        isDate: true
      }
    },
    sent_at: {
      type: DataTypes.DATE(3),
      allowNull: true,
      validate: {
        isDate: true
      }
    },
    address: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
      }
    },
    body: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
      }
    },
    android_id: {
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
        GuardianMetaMessage.belongsTo(models.Guardian, {as: 'Guardian'});
      },
      indexes: [
        {
          unique: true,
          fields: ["guid"]
        }
      ]
    }
  });

  return GuardianMetaMessage;
};
