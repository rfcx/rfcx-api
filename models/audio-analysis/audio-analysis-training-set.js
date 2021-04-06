'use strict'

module.exports = function (sequelize, DataTypes) {
  const AudioAnalysisTrainingSet = sequelize.define('AudioAnalysisTrainingSet', {
    guid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      unique: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
      }
    },
    event_value: {
      type: DataTypes.STRING,
      allowNull: false
    }
  }, {
    indexes: [
      { unique: true, fields: ['guid'] }
    ],
    tableName: 'AudioAnalysisTrainingSets'
  })

  return AudioAnalysisTrainingSet
}
