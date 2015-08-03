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

    migration.addColumn(
      'AuthTokens',
      'auth_hash',
      {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
        validate: {
        }
      }
    );

    migration.addColumn(
      'AuthTokens',
      'expires_at',
      {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: true,
        validate: {
          isDate: true
        }
      }
    );

    migration.removeColumn('AuthTokens', 'token');

    done();
    
  },

  down: function(migration, DataTypes, done) {

    migration.removeColumn('Guardians', 'auth_salt');
    migration.removeColumn('AuthTokens', 'auth_hash');
    migration.removeColumn('AuthTokens', 'expires_at');

    migration.addColumn(
      'AuthTokens',
      'token',
      {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
        validate: {
        }
      }
    );

    done();

  }
};
