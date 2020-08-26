'use strict'

module.exports = {
  up: function (migration, DataTypes, done) {
    var sqlAddColumnModel =
      'ALTER TABLE `Guardians` ADD COLUMN `stream` INTEGER DEFAULT NULL, ' +
      'ADD CONSTRAINT stream FOREIGN KEY (`stream`) REFERENCES `Streams`(`id`) ' +
      'ON UPDATE CASCADE ON DELETE RESTRICT'

    migration.sequelize.query(sqlAddColumnModel, {
      type: migration.sequelize.QueryTypes.RAW
    })

    done()
  },

  down: function (migration, DataTypes, done) {
    var sqlAddColumnModel =
      'ALTER TABLE `Guardians` DROP FOREIGN KEY stream, DROP COLUMN stream'

    migration.sequelize.query(sqlAddColumnModel, {
      type: migration.sequelize.QueryTypes.RAW
    })

    done()
  }
}
