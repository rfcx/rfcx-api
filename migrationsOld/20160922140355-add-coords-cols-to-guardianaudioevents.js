'use strict';

module.exports = {
  up: function (migration, DataTypes, done) {

    migration.addColumn(
      'GuardianAudioEvents',
      'shadow_latitude',
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
      'shadow_longitude',
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

    migration.removeColumn('GuardianAudioEvents', 'shadow_latitude');
    migration.removeColumn('GuardianAudioEvents', 'shadow_longitude');

    done();

  }
};