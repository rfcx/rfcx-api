'use strict';

module.exports = {
  up: function(migration, DataTypes, done) {

  migration.addColumn(
    "GuardianCheckIns",
    "queued_at",
    {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: true,
      validate: {
        isDate: true
      }
    }
  );

  done();
    
  },

  down: function(migration, DataTypes, done) {

  migration.removeColumn("GuardianCheckIns", "queued_at");

  done();

  }
};


