"use strict";

module.exports = function(sequelize, DataTypes) {
  var AttachmentType = sequelize.define("AttachmentType", {
    type: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
  }, {
    classMethods: {
      associate: function(models) {
      },
      indexes: [
      ]
    },
    tableName: "AttachmentTypes"
  });

  return AttachmentType;
};
