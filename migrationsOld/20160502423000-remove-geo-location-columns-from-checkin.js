'use strict';

module.exports = {
  up: function(migration, DataTypes, done) {


  migration.removeColumn('GuardianCheckIns', 'location_latitude');

  migration.removeColumn('GuardianCheckIns', 'location_longitude');

  migration.removeColumn('GuardianCheckIns', 'location_precision');

  done();
    
  },

  down: function(migration, DataTypes, done) {

  migration.addColumn(
    "GuardianCheckIns",
    "location_latitude",
    {
     type: DataTypes.FLOAT,
      allowNull: true,
      validate: {
        isFloat: true,
        min: -90,
        max: 90
      }
    }
  );

    migration.addColumn(
    "GuardianCheckIns",
    "location_longitude",
    {
      type: DataTypes.FLOAT,
      allowNull: true,
      validate: {
        isFloat: true,
        min: -180,
        max: 180
      }
    }
  );

  migration.addColumn(
    "GuardianCheckIns",
    "location_precision",
    {
      type: DataTypes.FLOAT,
      allowNull: true,
      validate: {
        isFloat: true,
        min: 0
      }
    }
  );

  done();

  }
};
