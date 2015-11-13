'use strict';

module.exports = {
  up: function(migration, DataTypes, done) {

  migration.addColumn(
    "GuardianEvents",
    "harmonic_intervals",
    {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false,
      validate: {
      }
    }
  );

  done();
    
  },

  down: function(migration, DataTypes, done) {

  migration.removeColumn("GuardianEvents", "harmonic_intervals");

  done();

  }
};


