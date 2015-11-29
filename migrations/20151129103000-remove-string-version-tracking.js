'use strict';

module.exports = {
  up: function(migration, DataTypes, done) {

  migration.removeColumn('Guardians', 'software_versions');

  migration.removeColumn('GuardianCheckIns', 'software_versions');

  done();
    
  },

  down: function(migration, DataTypes, done) {

  migration.addColumn(
    "GuardianCheckIns",
    "software_versions",
    {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
      }
    }
  );

  migration.addColumn(
    "Guardians",
    "software_versions",
    {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
      }
    }
  );

  done();

  }
};


