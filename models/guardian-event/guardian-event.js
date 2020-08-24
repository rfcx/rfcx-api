'use strict'

module.exports = function (sequelize, DataTypes) {
  var GuardianEvent = sequelize.define('GuardianEvent', {
    guid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      unique: true
    },
    classification_analysis: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false,
      validate: {
      }
    },
    classification_reviewer: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false,
      validate: {
      }
    },
    begins_at_analysis: {
      type: DataTypes.DATE(3),
      defaultValue: DataTypes.NOW,
      allowNull: true,
      validate: {
        isDate: { msg: 'begins_at_analysis for GuardianEvent should have type Date' }
      }
    },
    begins_at_reviewer: {
      type: DataTypes.DATE(3),
      defaultValue: DataTypes.NOW,
      allowNull: true,
      validate: {
        isDate: { msg: 'begins_at_reviewer for GuardianEvent should have type Date' }
      }
    },
    duration_analysis: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true,
        min: 1
      }
    },
    duration_reviewer: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true,
        min: 1
      }
    },
    invalidated_analysis: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      validate: {
      }
    },
    invalidated_reviewer: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      validate: {
      }
    },
    reviewed_at: {
      type: DataTypes.DATE(3),
      allowNull: true,
      validate: {
        isDate: { msg: 'reviewed_at for GuardianEvent should have type Date' }
      }
    },
    fingerprint: {
      type: DataTypes.TEXT,
      allowNull: true,
      unique: false,
      validate: {
      }
    },
    latitude: {
      type: DataTypes.FLOAT,
      allowNull: true,
      validate: {
        isFloat: true,
        min: -90,
        max: 90
      }
    },
    longitude: {
      type: DataTypes.FLOAT,
      allowNull: true,
      validate: {
        isFloat: true,
        min: -180,
        max: 180
      }
    }
  }, {
    indexes: [
      { unique: true, fields: ['guid'] }
    ],
    tableName: 'GuardianEvents'
  })

  return GuardianEvent
}
