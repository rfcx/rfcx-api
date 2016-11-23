'use strict';

module.exports = {
  up: function(migration, DataTypes, done) {

    migration.addColumn(
      'GuardianSites',
      'timezone',
      {
        type: DataTypes.STRING,
        defaultValue: 'UTC',
        allowNull: false,
        validate: {
        }
      }
    );

    done();
  },

  down: function(migration, DataTypes, done) {

    migration.removeColumn('GuardianSites', 'timezone');

    done();
  }
};
