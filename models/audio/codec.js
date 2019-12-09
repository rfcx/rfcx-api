"use strict";

module.exports = function(sequelize, DataTypes) {
  var Codec = sequelize.define("Codec", {
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
    tableName: "Codecs"
  });

  return Codec;
};
