"use strict";

module.exports = {
  up: function(migration, DataTypes, done) {

    migration.addColumn(
      'GuardianAudio',
      'url',
      {
        type: DataTypes.STRING,
        allowNull: true
      }
    );

    done();
  },

  down: function(migration, DataTypes, done) {

    migration.removeColumn('GuardianAudio', 'url');

    done();
  }
};
