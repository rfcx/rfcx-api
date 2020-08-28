'use strict'

module.exports = function (sequelize, DataTypes) {
  var AudioAnalysisEntry = sequelize.define('AudioAnalysisEntry', { }, {
    indexes: [
    ],
    tableName: 'AudioAnalysisEntry'
  })

  return AudioAnalysisEntry
}
