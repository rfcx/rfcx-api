'use strict';

module.exports = {
  up: function(migration, DataTypes, done) {

    migration.addColumn(
      'Guardians',
      'auth_salt',
      {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
        validate: {
        }
      }
    );

    done();
    
  },

  down: function(migration, DataTypes, done) {

    migration.removeColumn('Guardians', 'auth_salt');

    done();

  }
};
