'use strict'

module.exports = function (sequelize, DataTypes) {
  var AudioAnalysisLog = sequelize.define('AudioAnalysisLog', {

    guid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      unique: true
    },

    queued_at: {
      type: DataTypes.DATE(3),
      allowNull: true,
      validate: {
        isDate: { msg: 'queued_at for AudioAnalysisLog should have type Date' }
      }
    },

    launched_at: {
      type: DataTypes.DATE(3),
      allowNull: true,
      validate: {
        isDate: { msg: 'launched_at for AudioAnalysisLog should have type Date' }
      }
    },

    duration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      unique: false,
      validate: {
        isInt: true,
        min: 0
      }
    },

    host: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false,
      validate: {
      }
    }

  }, {
    indexes: [
      { unique: true, fields: ['guid'] }
    ],
    tableName: 'AudioAnalysisLogs'
  })

  return AudioAnalysisLog
}
