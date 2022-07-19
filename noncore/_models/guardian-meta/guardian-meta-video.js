'use strict'

module.exports = function (sequelize, DataTypes) {
  const GuardianMetaVideo = sequelize.define('GuardianMetaVideo', {
    guid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4
    },
    captured_at: {
      type: DataTypes.DATE(3),
      validate: {
        isDate: {
          msg: 'captured_at for GuardianMetaVideo should have type Date'
        }
      }
    },
    url: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    },
    size: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true,
        min: 0
      }
    },
    width: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true,
        min: 0
      }
    },
    height: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true,
        min: 0
      }
    },
    length: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true,
        min: 0
      }
    },
    format: {
      type: DataTypes.STRING,
      allowNull: true
    },
    sha1_checksum: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false
    },
    metadata: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'GuardianMetaVideos'
  })
  GuardianMetaVideo.associate = function (models) {
    GuardianMetaVideo.belongsTo(models.Guardian, { as: 'Guardian', foreignKey: 'guardian_id' })
  }
  return GuardianMetaVideo
}
