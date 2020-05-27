"use strict";

module.exports = function(sequelize, DataTypes) {
  var Classification = sequelize.define("Classification", {
    value: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: false
    },
    description: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
    },
    image: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    reference_audio: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    reference_spectrogram: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    source_external_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  }, {
    indexes: [
      { unique: true, fields: ["value"] },
      { fields: ["title"] }
    ],
    tableName: "Classifications"
  });
  Classification.attributes = {
    full: ['id', 'value', 'title', 'description', 'image', 'reference_audio', 'reference_spectrogram', 'source_id'],
    lite: ['id', 'value', 'title']
  }
  return Classification;
};
