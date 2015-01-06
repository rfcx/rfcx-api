"use strict";

module.exports = function(sequelize, DataTypes) {
  var GuardianMessage = sequelize.define("GuardianMessage", {
    guid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4
    },
    received_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      validate: {
        isDate: true
      }
    },
    origin: {
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
    }
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
        GuardianMessage.belongsTo(models.Guardian, {as: 'Guardian'});
        GuardianMessage.belongsTo(models.GuardianCheckIn, {as: 'CheckIn'});
      }
    }
  });

  return GuardianMessage;
};
