"use strict";

module.exports = {
  up: function(migration, DataTypes, done) {

    migration.addColumn(
      'GuardianAudio',
      'sha1_checksum',
      {
        type: DataTypes.STRING,
        allowNull: true
      }
    );

    done();
  },

  down: function(migration, DataTypes, done) {

    migration.removeColumn('GuardianAudio', 'sha1_checksum');

    done();
  }
};
