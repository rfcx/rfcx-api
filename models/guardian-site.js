"use strict";

module.exports = function(sequelize, DataTypes) {
  var GuardianSite = sequelize.define("GuardianSite", {
    guid: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
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
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      validate: {
      }
    },
    cartodb_map_id: {
      type: DataTypes.UUID,
      unique: false,
      allowNull: true,
      validate: {
      }
    },
    flickr_photoset_id: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false,
      validate: {
      }
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
      allowNull: false,
      validate: {
      }
    },
    bounds: {
      type: DataTypes.GEOMETRY,
      allowNull: true,
      validate: {
      }
    }
  }, {
    classMethods: {
      associate: function(models) {
        GuardianSite.hasMany(models.Guardian, {as: "Guardian", foreignKey: "site_id"});
        GuardianSite.hasMany(models.GuardianCheckIn, {as: "CheckIn", foreignKey: "site_id"});
        GuardianSite.hasMany(models.GuardianAudio, {as: "Audio", foreignKey: "site_id"});
        GuardianSite.hasMany(models.GuardianEvent, {as: "Event", foreignKey: "site_id"});
      },
      indexes: [
        {
          unique: true,
          fields: ["guid"]
        }
      ]
    }
  });

  return GuardianSite;
};
