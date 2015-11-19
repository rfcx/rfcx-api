'use strict';

module.exports = {
  up: function(migration, DataTypes, done) {

  migration.addColumn(
    "GuardianEvents",
    "classification_analysis",
    {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false,
      validate: {
      }
    }
  );

  migration.addColumn(
    "GuardianEvents",
    "classification_reviewer",
    {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false,
      validate: {
      }
    }
  );

  migration.addColumn(
    "GuardianEvents",
    "begins_at_analysis",
    {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: true,
      validate: {
        isDate: true
      }
    }
  );

  migration.addColumn(
    "GuardianEvents",
    "begins_at_reviewer",
    {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: true,
      validate: {
        isDate: true
      }
    }
  );

  migration.addColumn(
    "GuardianEvents",
    "duration_analysis",
    {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true,
        min: 1
      }
    }
  );

  migration.addColumn(
    "GuardianEvents",
    "duration_reviewer",
    {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true,
        min: 1
      }
    }
  );

  migration.addColumn(
    "GuardianEvents",
    "reviewed_at",
    {
      type: DataTypes.DATE,
      allowNull: true,
      validate: {
        isDate: true
      }
    }
  );



  done();
    
  },

  down: function(migration, DataTypes, done) {

  migration.removeColumn("GuardianEvents", "classification_analysis");
  migration.removeColumn("GuardianEvents", "classification_reviewer");
  migration.removeColumn("GuardianEvents", "begins_at_analysis");
  migration.removeColumn("GuardianEvents", "begins_at_reviewer");
  migration.removeColumn("GuardianEvents", "duration_analysis");
  migration.removeColumn("GuardianEvents", "duration_reviewer");
  migration.removeColumn("GuardianEvents", "reviewed_at");

  done();

  }
};


