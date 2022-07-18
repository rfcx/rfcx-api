'use strict'

module.exports = function (sequelize, DataTypes) {
  const GuardianMetaPhoto = sequelize.define('GuardianMetaPhoto', {
    guid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4
    },
    captured_at: {
      type: DataTypes.DATE(3),
      allowNull: true,
      validate: {
        isDate: {
          msg: 'captured_at for GuardianMetaPhoto should have type Date'
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
      type: DataTypes.TEXT('long'),
      allowNull: true
    }
  }, {
    tableName: 'GuardianMetaPhotos'
  })
  GuardianMetaPhoto.associate = function (models) {
    GuardianMetaPhoto.belongsTo(models.Guardian, { as: 'Guardian', foreignKey: 'guardian_id' })
  }
  return GuardianMetaPhoto
}
