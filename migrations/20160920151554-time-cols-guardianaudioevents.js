'use strict';

module.exports = {
  up: function (migration, DataTypes, done) {

    migration.addColumn(
      'GuardianAudioEvents',
      'begins_at',
      {
        type: DataTypes.DATE,
        allowNull: true,
        validate: {
          isDate: true
        }
      }
    );

    migration.addColumn(
      'GuardianAudioEvents',
      'ends_at',
      {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        validate: {
          isDate: true
        }
      }
    );

    done();
  },

  down: function (migration, DataTypes, done) {

    migration.removeColumn('GuardianAudioEvents', 'begins_at');
    migration.removeColumn('GuardianAudioEvents', 'ends_at');

    done();

  }
};