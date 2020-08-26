'use strict'

module.exports = {
  up: function (migration, DataTypes, done) {
    var sqlAddColumnModel = 'ALTER TABLE `Users`' +
      ' ADD COLUMN `default_site` INTEGER DEFAULT NULL' +
      ', ADD FOREIGN KEY (`default_site`) REFERENCES `GuardianSites`(`id`)' +
      ' ON UPDATE CASCADE ON DELETE RESTRICT'

    migration.sequelize.query(sqlAddColumnModel, {
      type: migration.sequelize.QueryTypes.RAW
    })

    done()
  },

  down: function (migration, DataTypes, done) {
    migration.removeColumn('Users', 'default_site')

    done()
  }
}
