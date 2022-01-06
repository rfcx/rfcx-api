'use strict'

module.exports = function (sequelize, DataTypes) {
  const Classification = sequelize.define('Classification', {
    value: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    description: {
      type: DataTypes.TEXT('long'),
      allowNull: true
    },
    image: {
      type: DataTypes.STRING,
      allowNull: true
    },
    reference_audio: {
      type: DataTypes.STRING,
      allowNull: true
    },
    reference_spectrogram: {
      type: DataTypes.STRING,
      allowNull: true
    },
    source_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    tableName: 'Classifications'
  })

  return Classification
}