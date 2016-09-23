'use strict';

module.exports = {
  up: function (migration, DataTypes, done) {

    var sqlAddColumnModel = "ALTER TABLE `GuardianAudioEvents`" +
      " ADD COLUMN `model` INTEGER DEFAULT NULL" +
      ", ADD FOREIGN KEY (`model`) REFERENCES `AudioAnalysisModels`(`id`)" +
      " ON UPDATE CASCADE ON DELETE RESTRICT";

    migration.sequelize.query(sqlAddColumnModel, {
      type: migration.sequelize.QueryTypes.RAW
    });

    done();
  },

  down: function (migration, DataTypes, done) {

    migration.removeColumn('GuardianAudioEvents', 'model');

    done();

  }
};