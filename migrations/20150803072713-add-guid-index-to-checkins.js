'use strict';

module.exports = {
  up: function(migration, DataTypes, done) {

    migration.addIndex(
      'GuardianCheckIns',
      ['guid'],
      {
        indicesType: 'UNIQUE'
      }
    );

    done();
    
  },

  down: function(migration, DataTypes, done) {

    migration.removeIndex('GuardianCheckIns', ['guid']);

    done();

  }
};


