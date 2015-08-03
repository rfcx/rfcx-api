'use strict';

module.exports = {
  up: function(migration, DataTypes, done) {

    migration.removeColumn('Users', 'last_check_in');

    migration.addColumn(
      'Guardians',
      'auth_token_salt',
      {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
        validate: {
        }
      }
    );

    migration.addColumn(
      'Guardians',
      'auth_token_hash',
      {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
        validate: {
        }
      }
    );

    migration.addColumn(
      'Guardians',
      'auth_token_updated_at',
      {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        validate: {
          isDate: true
        }
      }
    );

    migration.addColumn(
      'Guardians',
      'auth_token_expires_at',
      {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        validate: {
          isDate: true
        }
      }
    );

    done();
    
  },

  down: function(migration, DataTypes, done) {

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

    migration.removeColumn('Guardians', 'auth_token_salt');
    migration.removeColumn('Guardians', 'auth_token_hash');
    migration.removeColumn('Guardians', 'auth_token_updated_at');
    migration.removeColumn('Guardians', 'auth_token_expires_at');

    done();

  }
};
