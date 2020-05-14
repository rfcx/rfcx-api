"use strict";

module.exports = {
  up: function(migration, DataTypes, done) {

    migration.addColumn(
      'GuardianEvents',
      'guid',
      {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        unique: true
      }
    );

    migration.addColumn(
      'GuardianEvents',
      'classification',
      {
        type: DataTypes.STRING,
        allowNull: true
      }
    );

    migration.addColumn(
      'GuardianEvents',
      'measured_at',
      {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        validate: {
          isDate: true
        }
      }
    );

    migration.addColumn(
      'GuardianEvents',
      'latitude',
      {
        type: DataTypes.FLOAT,
        allowNull: true,
        validate: {
          isFloat: true,
          min: -90,
          max: 90
        }
      }
    );

    migration.addColumn(
      'GuardianEvents',
      'longitude',
      {
        type: DataTypes.FLOAT,
        allowNull: true,
        validate: {
          isFloat: true,
          min: -180,
          max: 180
        }
      }
    );

    done();
  },

  down: function(migration, DataTypes, done) {

    migration.removeColumn('GuardianEvents', 'guid');
    migration.removeColumn('GuardianEvents', 'classification');
    migration.removeColumn('GuardianEvents', 'measured_at');
    migration.removeColumn('GuardianEvents', 'latitude');
    migration.removeColumn('GuardianEvents', 'longitude');

    done();
  }
};
