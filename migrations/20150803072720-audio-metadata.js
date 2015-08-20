'use strict';

module.exports = {
  up: function(migration, DataTypes, done) {

    migration.addColumn(
      'GuardianAudio',
      'capture_format',
      {
        type: DataTypes.STRING,
        allowNull: true,
        unique: false,
        validate: {
        }
      }
    );

    migration.addColumn(
      'GuardianAudio',
      'capture_bitrate',
      {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          isInt: true,
          min: 0
        }
      }
    );

    migration.addColumn(
      'GuardianAudio',
      'capture_sample_rate',
      {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          isInt: true,
          min: 0
        }
      }
    );

    migration.addColumn(
      'GuardianAudio',
      'duration',
      {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          isInt: true,
          min: 0
        }
      }
    );

    migration.removeColumn('GuardianAudio', 'length');

    done();
    
  },

  down: function(migration, DataTypes, done) {

    migration.removeColumn('GuardianAudio', 'capture_format');
    migration.removeColumn('GuardianAudio', 'capture_bitrate');
    migration.removeColumn('GuardianAudio', 'capture_sample_rate');
    migration.removeColumn('GuardianAudio', 'duration');

    migration.addColumn(
      'GuardianAudio',
      'length',
      {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          isInt: true,
          min: 0
        }
      }
    );

    done();

  }
};


