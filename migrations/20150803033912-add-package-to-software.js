'use strict';

module.exports = {
  up: function(migration, DataTypes, done) {

    migration.addColumn(
      'GuardianSoftware',
      'package',
      {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
        }
      }
    );

    done();
    
  },

  down: function(migration, DataTypes, done) {

    migration.removeColumn('GuardianSoftware', 'package');

    done();

  }
};
