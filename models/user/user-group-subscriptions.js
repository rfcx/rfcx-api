"use strict";

module.exports = function(sequelize, DataTypes) {
  var UserGuardianGroupSubscription = sequelize.define("UserGuardianGroupSubscription", {}, {
    tableName: "UserGuardianGroupSubscriptions"
  });

  return UserGuardianGroupSubscription;
};
