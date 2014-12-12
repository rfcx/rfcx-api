"use strict";

module.exports = function(sequelize, DataTypes) {
  var User = sequelize.define("User", {
    name: DataTypes.STRING,
    guid: DataTypes.STRING,
    email: DataTypes.STRING,
    last_check_in: DataTypes.DATE
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
      }
    }
  });

  return User;
};
