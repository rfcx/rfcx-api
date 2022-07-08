'use strict'

module.exports = function (sequelize, DataTypes) {
  const GuardianSite = sequelize.define('GuardianSite', {
    guid: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    cartodb_map_id: {
      type: DataTypes.UUID,
      unique: false,
      allowNull: true
    },
    flickr_photoset_id: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false
    },
    timezone_offset: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        isInt: true
      }
    },
    timezone: {
      type: DataTypes.STRING,
      defaultValue: 'UTC',
      allowNull: false
    },
    bounds: {
      type: DataTypes.GEOMETRY,
      allowNull: true
    },
    map_image_url: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: { }
    },
    globe_icon_url: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: { }
    },
    classy_campaign_id: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: { }
    },
    protected_area: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true
      }
    },
    backstory: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    is_private: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: true,
      validate: { }
    },
    is_analyzable: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: true,
      validate: {}
    }
  }, {
    tableName: 'GuardianSites'
  })

  return GuardianSite
}
