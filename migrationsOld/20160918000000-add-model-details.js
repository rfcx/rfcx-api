'use strict';

module.exports = {
  up: function(migration, DataTypes, done) {

    migration.addColumn(
      'AudioAnalysisModels',
      'is_active',
      {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        validate: {
        }
      }
    );

    migration.addColumn(
      'AudioAnalysisModels',
      'ffmpeg_preprocess_options',
      {
        type: DataTypes.STRING,
        allowNull: true,
        unique: false,
        validate: {
        }
      }
    );

    migration.addColumn(
      'AudioAnalysisModels',
      'sox_preprocess_options',
      {
        type: DataTypes.STRING,
        allowNull: true,
        unique: false,
        validate: {
        }
      }
    );

    migration.addColumn(
      'AudioAnalysisModels',
      'imagemagick_preprocess_options',
      {
        type: DataTypes.STRING,
        allowNull: true,
        unique: false,
        validate: {
        }
      }
    );

    done();
  },

  down: function(migration, DataTypes, done) {

    migration.removeColumn('AudioAnalysisModels', 'is_active');
    migration.removeColumn('AudioAnalysisModels', 'ffmpeg_preprocess_options');
    migration.removeColumn('AudioAnalysisModels', 'sox_preprocess_options');
    migration.removeColumn('AudioAnalysisModels', 'imagemagick_preprocess_options');

    done();
  }
};
