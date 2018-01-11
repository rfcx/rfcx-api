"use strict";

module.exports = function(sequelize, DataTypes) {
  var FilterPreset = sequelize.define("FilterPreset", {
    guid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      unique: true
    },
    type: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false,
      validate: {
      }
    },
    json: {
      type: DataTypes.TEXT('long'),
      allowNull: false
    }
  }, {
    classMethods: {
      associate: function(models) {
        FilterPreset.belongsTo(models.User, { foreignKey: 'created_by', as: 'UserCreated' });
        FilterPreset.belongsTo(models.User, { foreignKey: 'updated_by', as: 'UserUpdated' });
      },
      indexes: [
        {
          unique: true,
          fields: ["guid"]
        }
      ]
    },
    tableName: "FilterPresets"
  });

  return FilterPreset;
};
