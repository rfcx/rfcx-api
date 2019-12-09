"use strict";

module.exports = function(sequelize, DataTypes) {
  var Format = sequelize.define("Format", {
    value: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    }
  }, {
    classMethods: {
      indexes: [{
        unique: true,
        fields: ["value"]
      }]
    },
    tableName: "Formats"
  });

  return Format;
};
