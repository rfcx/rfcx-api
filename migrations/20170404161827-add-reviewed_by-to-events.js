'use strict';

module.exports = {
  up: function (migration, DataTypes, done) {

    var sqlAddColumnModel = "ALTER TABLE `GuardianAudioEvents`" +
      " ADD COLUMN `reviewed_by` INTEGER DEFAULT NULL" +
      ", ADD FOREIGN KEY (`reviewed_by`) REFERENCES `Users`(`id`)" +
      " ON UPDATE CASCADE ON DELETE RESTRICT";

    migration.sequelize.query(sqlAddColumnModel, {
      type: migration.sequelize.QueryTypes.RAW
    });

    done();
  },

  down: function (migration, DataTypes, done) {

    migration.removeColumn('GuardianAudioEvents', 'reviewed_by');

    done();

  }
};