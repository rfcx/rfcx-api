'use strict';

module.exports = {
  up: function (migration, DataTypes, done) {

    migration.addColumn(
      'GuardianAudioEvents',
      'latitude',
      {
        type: DataTypes.FLOAT,
        allowNull: true,
        validate: {
          isFloat: true,
          min: -90,
          max: 90
        }
      }
    );

    migration.addColumn(
      'GuardianAudioEvents',
      'longitude',
      {
        type: DataTypes.FLOAT,
        allowNull: true,
        validate: {
          isFloat: true,
          min: -180,
          max: 180
        }
      }
    );

    done();
  },

  down: function (migration, DataTypes, done) {

    migration.removeColumn('GuardianAudioEvents', 'latitude');
    migration.removeColumn('GuardianAudioEvents', 'longitude');

    done();

  }
};