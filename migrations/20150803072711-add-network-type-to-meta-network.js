'use strict';

module.exports = {
  up: function(migration, DataTypes, done) {

    migration.addColumn(
      'GuardianMetaNetwork',
      'network_type',
      {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
        }
      }
    );

    done();
    
  },

  down: function(migration, DataTypes, done) {

    migration.removeColumn('GuardianMetaNetwork', 'network_type');

    done();

  }
};


