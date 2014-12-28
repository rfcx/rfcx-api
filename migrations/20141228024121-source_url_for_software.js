"use strict";

module.exports = {
  up: function(migration, DataTypes, done) {

    migration.addColumn(
      'GuardianSoftware',
      'url',
      {
        type: DataTypes.STRING,
        allowNull: true
      }
    );

    done();
  },

  down: function(migration, DataTypes, done) {

    migration.removeColumn('GuardianSoftware', 'url');

    done();
  }
};
