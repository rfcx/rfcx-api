'use strict';

module.exports = {
  up: function(migration, DataTypes, done) {

    migration.addColumn(
      'Users',
      'last_login_at',
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

    migration.removeColumn("Users", 'last_login_at');

    done();

  }
};


