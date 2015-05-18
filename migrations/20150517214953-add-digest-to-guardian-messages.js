"use strict";

module.exports = {
  up: function(migration, DataTypes, done) {

    migration.addColumn(
      'GuardianMessages',
      'digest',
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

    migration.removeColumn('GuardianMessages', 'digest');

    done();
  }
};