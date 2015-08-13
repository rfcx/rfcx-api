"use strict";

module.exports = function(sequelize, DataTypes) {
  var GuardianMessage = sequelize.define("GuardianMessage", {
    guid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4
    },
    received_at: {
      type: DataTypes.DATE,
      allowNull: true,
      validate: {
        isDate: true
      }
    },
    sent_at: {
      type: DataTypes.DATE,
      allowNull: true,
      validate: {
        isDate: true
      }
    },
    number: {
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
        GuardianMessage.belongsTo(models.Guardian, {as: 'Guardian'});
      }
    }
  });

  return GuardianMessage;
};
