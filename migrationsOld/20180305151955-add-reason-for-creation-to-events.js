'use strict';

module.exports = {
  up: function (migration, DataTypes, done) {

    var sqlAddColumnModel = "ALTER TABLE `GuardianAudioEvents`" +
      " ADD COLUMN `reason_for_creation` INTEGER DEFAULT NULL" +
      ", ADD FOREIGN KEY (`reason_for_creation`) REFERENCES `GuardianAudioEventReasonsForCreation`(`id`)" +
      " ON UPDATE CASCADE ON DELETE RESTRICT";

    migration.sequelize.query(sqlAddColumnModel, {
      type: migration.sequelize.QueryTypes.RAW
    });

    done();
  },

  down: function (migration, DataTypes, done) {

    migration.removeColumn('GuardianAudioEvents', 'reason_for_creation');

    done();

  }
};
