"use strict";

module.exports = function(sequelize, DataTypes) {
  var ClassificationSource = sequelize.define("ClassificationSource", {
    value: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    }
  }, {
    classMethods: {
      associate: function(models) {
      },
      indexes: [
        { unique: true, fields: ["value"] }
      ]
    },
    tableName: "ClassificationSources"
  });

  return ClassificationSource;
};
