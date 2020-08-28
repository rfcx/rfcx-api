'use strict'

module.exports = function (sequelize, DataTypes) {
  var GuardianAudioHighlight = sequelize.define('GuardianAudioHighlight', {
    guid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      unique: true
    },
    group: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false,
      validate: {
      }
    },
    order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: false,
      validate: {
        isInt: true,
        min: 0
      }
    },
    type: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false,
      validate: {
      }
    },
    begins_at: {
      type: DataTypes.DATE(3),
      defaultValue: DataTypes.NOW,
      validate: {
        isDate: { msg: 'begins_at for GuardianAudioHighlight should have type Date' }
      }
    },
    label: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false,
      validate: {
      }
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false,
      validate: {
      }
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false,
      validate: {
      }
    },
    location: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false,
      validate: {
      }
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      validate: {}
    },
    flickr_photoset_id: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false,
      validate: {
      }
    },
    video360_url: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false
    }
  }, {
    indexes: [
      { unique: true, fields: ['guid'] }
    ],
    tableName: 'GuardianAudioHighlights'
  })

  return GuardianAudioHighlight
}
