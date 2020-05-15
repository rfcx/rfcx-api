"use strict";

module.exports = {
  up: function(migration, DataTypes, done) {

    migration.addColumn(
      'Guardians',
      'shortname',
      {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
        validate: {
        }
      }
    );

    done();
  },

  down: function(migration, DataTypes, done) {

    migration.removeColumn('Guardians', 'shortname');

    done();
  }
};

