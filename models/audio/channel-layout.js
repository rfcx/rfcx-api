"use strict";

module.exports = function(sequelize, DataTypes) {
  var ChannelLayout = sequelize.define("ChannelLayout", {
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
    tableName: "ChannelLayouts"
  });

  return ChannelLayout;
};
