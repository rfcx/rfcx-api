"use strict";

module.exports = {
  up: function(migration, DataTypes, done) {
    migration.renameColumn('MappingUsers','username','name');
    done();
  },

  down: function(migration, DataTypes, done) {
    migration.renameColumn('MappingUsers','name','username');
    done();
  }
};
