"use strict";

module.exports = function(sequelize, DataTypes) {
  var UserLocation = sequelize.define("UserLocation", {
    location: {
      type: DataTypes.GEOGRAPHY('POINT'),
      allowNull: false,
      get: function() {
        var geoPoint = this.getDataValue('location');
        return (geoPoint === null) ? null : geoPoint.coordinates;
      },
      set: function(coords) {
        if (coords === null) {
          this.setDataValue('location', null);
        } else {
          this.setDataValue('location', { type: 'Point', coordinates: coords });
        }
      },
      validations: {
        isCoordinateArray: function(value) {
          if (!_.isArray(value) || value.length !== 2) {
            throw new Error('Must be an array with 2 elements');
          }
        }
      }
    },
    time: {
      type: DataTypes.DATE(3),
      allowNull: false,
      validate: {
        isDate: true
      },
    },
  }, {
    classMethods: {
      associate: function(models) {
        UserLocation.belongsTo(models.User, { as: 'Location', foreignKey: 'user_id' });
      },
      indexes: [
        {
          unique: true,
          fields: ["guid"]
        }
      ]
    },
    tableName: "UserLocations"
  });

  return UserLocation;
};

