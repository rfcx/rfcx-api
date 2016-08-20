'use strict';

module.exports = {
  up: function(migration, DataTypes, done) {

    migration.addColumn(
      'AudioAnalysisModels',
      'method_name',
      {
        type: DataTypes.STRING,
        allowNull: false,
        unique: false,
        validate: {
        }
      }
    );

    done();
  },

  down: function(migration, DataTypes, done) {

    migration.removeColumn('AudioAnalysisModels', 'method_name');

    done();
  }
};
