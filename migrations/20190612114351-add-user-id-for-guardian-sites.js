'use strict';

module.exports = {
  up: function (migration, DataTypes, done) {

    var sqlAddColumnModel = "ALTER TABLE `GuardianSites`" +
      " ADD COLUMN `user_id` INTEGER DEFAULT NULL" +
      ", ADD FOREIGN KEY (`user_id`) REFERENCES `Users`(`id`)" +
      " ON UPDATE CASCADE ON DELETE RESTRICT";

    migration.sequelize.query(sqlAddColumnModel, {
      type: migration.sequelize.QueryTypes.RAW
    });

    done();
  },

  down: function (migration, DataTypes, done) {

    migration.removeColumn('GuardianSites', 'user_id');

    done();

  }
};
