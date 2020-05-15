'use strict';

module.exports = {
  up: function(migration, DataTypes, done) {

    migration.addColumn(
      'Guardians',
      'software_versions',
      {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
        }
      }
    );

    migration.removeColumn('Guardians', 'version_id');

    done();
    
  },

  down: function(migration, DataTypes, done) {

    migration.removeColumn('Guardians', 'software_versions');

    done();

  }
};


