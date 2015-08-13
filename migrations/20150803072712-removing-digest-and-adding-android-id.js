'use strict';

module.exports = {
  up: function(migration, DataTypes, done) {

    migration.addColumn(
      'GuardianMessages',
      'android_id',
      {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          isInt: true,
          min: 0
        }
      }
    );

    migration.removeColumn('GuardianMessages', 'digest');

    done();
    
  },

  down: function(migration, DataTypes, done) {

    migration.removeColumn('GuardianMessages', 'android_id');

    migration.addColumn(
      'GuardianMessages',
      'digest',
      {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
        }
      }
    );

    done();

  }
};


