"use strict";

module.exports = {
  up: function(migration, DataTypes, done) {

    migration.addColumn(
      'GuardianAudio',
      'analyzed_at',
      {
        type: DataTypes.DATE,
        validate: {
          isDate: true
        }
      }
    );

    done();
  },

  down: function(migration, DataTypes, done) {

    migration.removeColumn('GuardianAudio', 'analyzed_at');
    
    done();
  }
};
