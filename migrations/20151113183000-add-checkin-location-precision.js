'use strict';

module.exports = {
  up: function(migration, DataTypes, done) {

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
    
  },

  down: function(migration, DataTypes, done) {

  migration.removeColumn("GuardianCheckIns", "location_precision");

  done();

  }
};


