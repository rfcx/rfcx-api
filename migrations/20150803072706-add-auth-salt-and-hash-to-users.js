'use strict';

module.exports = {
  up: function(migration, DataTypes, done) {

    migration.removeColumn('Users', 'last_check_in');

    migration.addColumn(
      'Users',
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
      'Users',
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
      'Users',
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
      'Users',
      'auth_token_expires_at',
      {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        validate: {
          isDate: true
        }
      }
    );

    migration.addColumn(
      'Users',
      'auth_password_salt',
      {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
        validate: {
        }
      }
    );

    migration.addColumn(
      'Users',
      'auth_password_hash',
      {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
        validate: {
        }
      }
    );

    migration.addColumn(
      'Users',
      'auth_password_updated_at',
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
      'Users',
      'last_check_in',
      {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        validate: {
          isDate: true
        }
      }
    );

    migration.removeColumn('Users', 'auth_token_salt');
    migration.removeColumn('Users', 'auth_token_hash');
    migration.removeColumn('Users', 'auth_token_updated_at');
    migration.removeColumn('Users', 'auth_token_expires_at');

    migration.removeColumn('Users', 'auth_password_salt');
    migration.removeColumn('Users', 'auth_password_hash');
    migration.removeColumn('Users', 'auth_password_updated_at');

    done();

  }
};
