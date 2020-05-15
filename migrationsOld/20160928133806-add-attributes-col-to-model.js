'use strict';

module.exports = {
  up: function (migration, DataTypes, done) {

    migration.addColumn(
      'AudioAnalysisModels',
      'attrs',
      {
        type: DataTypes.TEXT('long'),
        allowNull: true,
        validate: {
        }
      }
    );

    done();
  },

  down: function (migration, DataTypes, done) {

    migration.removeColumn('AudioAnalysisModels', 'attrs');

    done();

  }
};