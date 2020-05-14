'use strict';

module.exports = {
  up: function(migration, DataTypes, done) {

    migration.addColumn(
      'Guardians',
      'prefs_audio_capture_interval',
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
      'Guardians',
      'prefs_service_monitor_interval',
      {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          isInt: true,
          min: 1
        }
      }
    );

    done();
    
  },

  down: function(migration, DataTypes, done) {

    migration.removeColumn('Guardians', 'prefs_audio_capture_interval');
    migration.removeColumn('Guardians', 'prefs_service_monitor_interval');

    done();

  }
};
