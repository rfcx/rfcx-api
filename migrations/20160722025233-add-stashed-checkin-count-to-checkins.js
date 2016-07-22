'use strict';

module.exports = {
  up: function(migration, DataTypes, done) {

    migration.addColumn(
      'GuardianCheckins',
      'guardian_stashed_checkins',
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

    migration.removeColumn('GuardianCheckins', 'guardian_stashed_checkins');

    done();
  }
};
