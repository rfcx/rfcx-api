'use strict';

module.exports = {
  up: function(migration, DataTypes, done) {

  migration.addColumn(
    "GuardianEvents",
    "invalidated_analysis",
    {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      validate: {
      }
    }
  );
  
  migration.addColumn(
    "GuardianEvents",
    "invalidated_reviewer",
    {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      validate: {
      }
    }
  );

  done();
    
  },

  down: function(migration, DataTypes, done) {

  migration.removeColumn("GuardianEvents", "invalidated_analysis");
  migration.removeColumn("GuardianEvents", "invalidated_reviewer");

  done();

  }
};


