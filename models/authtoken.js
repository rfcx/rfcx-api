"use strict";

module.exports = function(sequelize, DataTypes) {
  var AuthToken = sequelize.define("AuthToken", {
    type: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: false,
      validate: {
      }
    },
    token: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
      }
    }
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
         AuthToken.belongsTo(models.User);
      }
    }
  });

  return AuthToken;
};
