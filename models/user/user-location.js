"use strict";

module.exports = function(sequelize, DataTypes) {
  var UserLocation = sequelize.define("UserLocation", {
    latitude: {
      type: DataTypes.FLOAT,
      allowNull: false,
      validate: {
        isFloat: true,
        min: {
          args: [ -90 ],
          msg: 'latitude should be equal to or greater than -90'
        },
        max: {
          args: [ 90 ],
          msg: 'latitude should be equal to or less than 90'
        }
      }
    },
    longitude: {
      type: DataTypes.FLOAT,
      allowNull: false,
      validate: {
        isFloat: true,
        min: {
          args: [ -180 ],
          msg: 'longitude should be equal to or greater than -180'
        },
        max: {
          args: [ 180 ],
          msg: 'longitude should be equal to or less than 180'
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
      indexes: []
    },
    tableName: "UserLocations"
  });

  return UserLocation;
};

