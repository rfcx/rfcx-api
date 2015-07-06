'use strict';

module.exports = {
  up: function(migration, DataTypes, done) {

    migration.addColumn(
      'Guardians',
      'is_certified',
      {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        validate: {
        }
      }
    );

    done();
    
  },

  down: function(migration, DataTypes, done) {

    migration.removeColumn('Guardians', 'is_certified');

    done();

  }
};
