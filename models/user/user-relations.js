"use strict";

module.exports = function(sequelize, DataTypes) {
  var UserSiteRelation = sequelize.define("UserSiteRelation", {}, {
    tableName: "UserSiteRelations"
  });

  return UserSiteRelation;
};
