'use strict';

module.exports = {
  up: function (migration, DataTypes, done) {

    var sqlAddColumnModel = "ALTER TABLE `GuardianGroups`" +
      " ADD COLUMN `site` INTEGER DEFAULT NULL" +
      ", ADD FOREIGN KEY (`site`) REFERENCES `GuardianSites`(`id`)" +
      " ON UPDATE CASCADE ON DELETE RESTRICT";

    migration.sequelize.query(sqlAddColumnModel, {
      type: migration.sequelize.QueryTypes.RAW
    });

    done();
  },

  down: function (migration, DataTypes, done) {

    migration.removeColumn('GuardianGroups', 'site');

    done();

  }
};
