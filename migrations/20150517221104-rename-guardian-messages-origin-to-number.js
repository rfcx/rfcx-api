'use strict';

module.exports = {
  up: function(migration, DataTypes, done) {
    migration.renameColumn('GuardianMessages','origin','number');
    done();
  },

  down: function(migration, DataTypes, done) {
    migration.renameColumn('GuardianMessages','number','origin');
    done();
  }
};
