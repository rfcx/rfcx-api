'use strict';

module.exports = {
  up: function(migration, DataTypes, done) {

    migration.removeColumn('GuardianCheckIns', 'internal_luminosity');

    done();
    
  },

  down: function(migration, DataTypes, done) {


    migration.addColumn(
      'GuardianCheckIns',
      'internal_luminosity',
      {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          isInt: true,
          min: 0,
          max: 65536
        }
      }
    );

    done();

  }
};
