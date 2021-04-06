'use strict'

module.exports = {
  up: function (migration, DataTypes, done) {
    const sqlAddColumnModel =
      'ALTER TABLE `Guardians` ADD COLUMN `creator` INTEGER DEFAULT NULL, ' +
      'ADD CONSTRAINT creator FOREIGN KEY (`creator`) REFERENCES `Users`(`id`) ' +
      'ON UPDATE CASCADE ON DELETE RESTRICT'

    migration.sequelize.query(sqlAddColumnModel, {
      type: migration.sequelize.QueryTypes.RAW
    })

    done()
  },

  down: function (migration, DataTypes, done) {
    const sqlAddColumnModel =
      'ALTER TABLE `Guardians` DROP FOREIGN KEY creator, DROP COLUMN creator'

    migration.sequelize.query(sqlAddColumnModel, {
      type: migration.sequelize.QueryTypes.RAW
    })

    done()
  }
}
