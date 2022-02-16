'use strict'

module.exports = function (sequelize, DataTypes) {
  const AudioAnalysisEntry = sequelize.define('AudioAnalysisEntry', { }, {
    indexes: [
    ],
    tableName: 'AudioAnalysisEntry'
  })

  return AudioAnalysisEntry
}
