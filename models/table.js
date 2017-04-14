"use strict";

module.exports = function(sequelize, DataTypes) {
  var Table = sequelize.define("Table", {
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
    tableName: "Tables"
  });

  return Table;
};
