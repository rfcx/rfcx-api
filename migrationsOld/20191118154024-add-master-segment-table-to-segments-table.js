'use strict'

module.exports = {
  up: function (migration, DataTypes, done) {
    var sqlAddColumnModel =
      'ALTER TABLE `Segments` ADD COLUMN `master_segment` INTEGER DEFAULT NULL, ' +
      'ADD CONSTRAINT master_segment FOREIGN KEY (`master_segment`) REFERENCES `MasterSegments`(`id`) ' +
      'ON UPDATE CASCADE ON DELETE RESTRICT'

    migration.sequelize.query(sqlAddColumnModel, {
      type: migration.sequelize.QueryTypes.RAW
    })

    done()
  },

  down: function (migration, DataTypes, done) {
    var sqlAddColumnModel =
      'ALTER TABLE `Segments` DROP FOREIGN KEY master_segment, DROP COLUMN master_segment'

    migration.sequelize.query(sqlAddColumnModel, {
      type: migration.sequelize.QueryTypes.RAW
    })

    done()
  }
}
