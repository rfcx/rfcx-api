"use strict";

module.exports = function(sequelize, DataTypes) {
  var SingleUseToken = sequelize.define("SingleUseToken", {
    guid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      unique: true
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
      }
    },
    remaining_uses: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      validate: {
        isInt: true,
        min: 0
      }
    },
    auth_token_salt: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
      validate: {
      }
    },
    auth_token_hash: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
      validate: {
      }
    },
    auth_token_updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      validate: {
        isDate: true
      }
    },
    auth_token_expires_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      validate: {
        isDate: true
      }
    },
  }, {
    classMethods: {
      associate: function(models) {
      },
      indexes: [
        {
          unique: true,
          fields: ["guid"]
        }
      ]
    }
  });

  return SingleUseToken;
};
