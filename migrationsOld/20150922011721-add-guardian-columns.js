'use strict';

module.exports = {
  up: function(migration, DataTypes, done) {

  migration.addColumn(
    "Guardians",
    "cartodb_coverage_id",
    {
      type: DataTypes.UUID,
      unique: false,
      allowNull: true,
      validate: {
      }
    }
  );

  migration.addColumn(
    "Guardians",
    "carrier_name",
    {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
      }
    }
  );

  done();
    
  },

  down: function(migration, DataTypes, done) {

  migration.removeColumn("Guardians", "cartodb_coverage_id");
  migration.removeColumn("Guardians", "carrier_name");

  done();

  }
};


