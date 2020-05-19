'use strict';

module.exports = {
  up: function (migration, DataTypes, done) {

    migration.renameColumn('AudioAnalysisModels','attrs','config');

    done();

  },

  down: function (migration, DataTypes, done) {

    migration.renameColumn('AudioAnalysisModels','config','attrs');

    done();

  }
};