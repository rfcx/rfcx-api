"use strict";

module.exports = function(sequelize, DataTypes) {
  var ResetPasswordToken = sequelize.define("ResetPasswordToken", {
    guid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      unique: true
    },
    expires_at: {
      type: DataTypes.DATE(3),
      defaultValue: DataTypes.NOW,
      validate: {
        isDate: true
      }
    }
  }, {
    classMethods: {
      associate: function(models) {
        ResetPasswordToken.belongsTo(models.User, {as: 'User', foreignKey: "user_id"});
      },
      indexes: [
        {
          unique: true,
          fields: ["guid"]
        }
      ]
    },
    tableName: "ResetPasswordTokens"
  });

  return ResetPasswordToken;
};
