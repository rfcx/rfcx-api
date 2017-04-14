"use strict";

module.exports = function(sequelize, DataTypes) {
  var SourceType = sequelize.define("SourceType", {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    }
  }, {
    classMethods: {
      indexes: [{
        unique: true,
        fields: ["name"]
      }]
    },
    tableName: "SourceTypes"
  });

  return SourceType;
};
