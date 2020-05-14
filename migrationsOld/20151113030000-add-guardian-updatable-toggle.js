'use strict';

module.exports = {
  up: function(migration, DataTypes, done) {

  migration.addColumn(
    "Guardians",
    "is_updatable",
    {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      validate: {
      }
    }
  );

  done();
    
  },

  down: function(migration, DataTypes, done) {

  migration.removeColumn("Guardians", "is_updatable");

  done();

  }
};


