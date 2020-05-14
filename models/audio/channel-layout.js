"use strict";

module.exports = function(sequelize, DataTypes) {
  var ChannelLayout = sequelize.define("ChannelLayout", {
    value: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    }
  }, {
    indexes: [
      { unique: true, fields: ["value"] }
    ],
    tableName: "ChannelLayouts"
  });

  return ChannelLayout;
};
