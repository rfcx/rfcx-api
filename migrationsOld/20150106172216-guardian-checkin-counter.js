"use strict";

module.exports = {
  up: function(migration, DataTypes, done) {

    migration.addColumn(
      'Guardians',
      'check_in_count',
      {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        validate: {
          isInt: true,
          min: 0
        }
      }
    );

    done();
  },

  down: function(migration, DataTypes, done) {

    migration.removeColumn('Guardians', 'check_in_count');

    done();
  }
};
