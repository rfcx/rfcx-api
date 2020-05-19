'use strict';

module.exports = {
  up: function (migration, DataTypes, done) {

    var sqlAddColumnType = "ALTER TABLE `AudioAnalysisModels`" +
      " ADD COLUMN `event_type` INTEGER DEFAULT NULL" +
      ", ADD FOREIGN KEY (`event_type`) REFERENCES `GuardianAudioEventTypes`(`id`)" +
      " ON UPDATE CASCADE ON DELETE RESTRICT";

    var sqlAddColumnValue = "ALTER TABLE `AudioAnalysisModels`" +
      " ADD COLUMN `event_value` INTEGER DEFAULT NULL" +
      ", ADD FOREIGN KEY (`event_value`) REFERENCES `GuardianAudioEventValues`(`id`)" +
      " ON UPDATE CASCADE ON DELETE RESTRICT";

    migration.sequelize.query(sqlAddColumnType, {
      type: migration.sequelize.QueryTypes.RAW
    });

    migration.sequelize.query(sqlAddColumnValue, {
      type: migration.sequelize.QueryTypes.RAW
    });

    migration.addColumn(
      'AudioAnalysisModels',
      'minimal_detection_confidence',
      {
        type: DataTypes.FLOAT,
        allowNull: true,
        validate: {
          isFloat: true
        }
      }
    );

    migration.addColumn(
      'AudioAnalysisModels',
      'minimal_detected_windows',
      {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          isInt: true,
          min: 1
        }
      }
    );

    migration.addColumn(
      'AudioAnalysisModels',
      'generate_event',
      {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        validate: {
        }
      }
    );

    done();
  },

  down: function (migration, DataTypes, done) {

    migration.removeColumn('AudioAnalysisModels', 'minimal_detection_confidence');
    migration.removeColumn('AudioAnalysisModels', 'minimal_detected_windows');
    migration.removeColumn('AudioAnalysisModels', 'generate_event');
    migration.removeColumn('AudioAnalysisModels', 'event_type');
    migration.removeColumn('AudioAnalysisModels', 'event_value');

    done();

  }
};