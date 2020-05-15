'use strict';

module.exports = {
  up: function(migration, DataTypes, done) {

    migration.addColumn(
      'GuardianCheckIns',
      'guardian_queued_checkins',
      {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          isInt: true,
          min: 0
        }
      }
    );

    migration.addColumn(
      'GuardianCheckIns',
      'guardian_skipped_checkins',
      {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          isInt: true,
          min: 0
        }
      }
    );

    done();
  },

  down: function(migration, DataTypes, done) {

    migration.removeColumn('GuardianCheckIns', 'guardian_queued_checkins');
    migration.removeColumn('GuardianCheckIns', 'guardian_skipped_checkins');

    done();
  }
};
