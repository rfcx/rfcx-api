
module.exports = function (sequelize, DataTypes) {
  const Location = sequelize.define("Location", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    latitude: {
      type: DataTypes.DOUBLE,
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
      type: DataTypes.DOUBLE,
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
  }, {
    timestamps: true,
  })
  Location.attributes = {
    full: ['id', 'name', 'description', 'latitude', 'longitude', 'created_at', 'updated_at'],
    lite: ['id', 'name', 'latitude', 'longitude'],
  }
  return Location
};
