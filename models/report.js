'use strict';

// Creates a repository of reports for incidents
// like 'heard a chainsaw' or 'poacher sighting'
module.exports = function(sequelize, DataTypes) {
  var Report = sequelize.define('Report', {
    guid: {
      type:DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      unique: true
    },
    start_time: DataTypes.DATE,
    end_time: DataTypes.DATE,
    long: DataTypes.REAL,
    lat: DataTypes.REAL,
    type: DataTypes.STRING,
    distance: { // 0 is immediate area (nearby), 50 is not far away (but not visible), 100 very far (faintly heard)
      type: DataTypes.INTEGER,
      validate: {
        isInt: true,
        min: 0,
        max: 100
      },
      allowNull: true
    }
  }, {
    classMethods: {
      associate: function(models) {
        Report.belongsTo(models.User, {foreignKey: 'reporter'});
      }
    }
  });
  return Report;
};
