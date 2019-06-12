'use strict';

module.exports = {
  up: function (migration, DataTypes, done) {

    var sqlAddColumnModel = "ALTER TABLE `Guardians`" +
      " ADD COLUMN `creator` INTEGER DEFAULT NULL" +
      ", ADD FOREIGN KEY (`creator`) REFERENCES `Users`(`id`)" +
      " ON UPDATE CASCADE ON DELETE RESTRICT";

    migration.sequelize.query(sqlAddColumnModel, {
      type: migration.sequelize.QueryTypes.RAW
    });

    done();
  },

  down: function (migration, DataTypes, done) {

    migration.removeColumn('Guardians', 'creator');

    done();

  }
};
