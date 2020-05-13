"use strict";

module.exports = function(sequelize, DataTypes) {
  var FileExtension = sequelize.define("FileExtension", {
    value: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    }
  }, {
    indexes: [
      { unique: true, fields: ['value'] }
    ],
    tableName: "FileExtensions"
  });

  return FileExtension;
};
