'use strict';

module.exports = {
  up: function(migration, DataTypes, done) {

    migration.addColumn(
      'RegistrationTokens',
      'allowed_redemptions',
      {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        validate: {
          isInt: true,
          min: 1
        }
      }
    );

    migration.addColumn(
      'RegistrationTokens',
      'created_for',
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

    migration.removeColumn("RegistrationTokens", 'created_for');
    migration.removeColumn("RegistrationTokens", 'allowed_redemptions');

    done();

  }
};


