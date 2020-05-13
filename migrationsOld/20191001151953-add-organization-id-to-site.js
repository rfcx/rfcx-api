'use strict';

module.exports = {
  up: function (migration, DataTypes, done) {

    var sqlAddColumnModel =
      "ALTER TABLE `GuardianSites` ADD COLUMN `organization` INTEGER DEFAULT NULL, " +
      "ADD CONSTRAINT organization FOREIGN KEY (`organization`) REFERENCES `Organizations`(`id`) " +
      "ON UPDATE CASCADE ON DELETE RESTRICT";

    migration.sequelize.query(sqlAddColumnModel, {
      type: migration.sequelize.QueryTypes.RAW
    });

    done();
  },

  down: function (migration, DataTypes, done) {

    var sqlAddColumnModel =
      "ALTER TABLE `GuardianSites` DROP FOREIGN KEY organization, DROP COLUMN organization";

    migration.sequelize.query(sqlAddColumnModel, {
      type: migration.sequelize.QueryTypes.RAW
    });

    done();

  }
};
