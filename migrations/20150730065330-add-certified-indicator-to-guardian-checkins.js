'use strict';

module.exports = {
  up: function(migration, DataTypes, done) {

    migration.addColumn(
      'GuardianCheckIns',
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

    migration.removeColumn('GuardianCheckIns', 'is_certified');

    done();

  }
};
