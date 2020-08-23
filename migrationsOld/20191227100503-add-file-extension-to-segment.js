'use strict'

module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface.sequelize.query('ALTER TABLE `Segments` ADD COLUMN `file_extension` INTEGER DEFAULT NULL, ' +
      'ADD CONSTRAINT file_extension FOREIGN KEY (`file_extension`) REFERENCES `FileExtensions`(`id`) ' +
      'ON UPDATE CASCADE ON DELETE RESTRICT', {
      type: queryInterface.sequelize.QueryTypes.RAW
    })
  },

  down: function (queryInterface, Sequelize) {
    return queryInterface.sequelize.query('ALTER TABLE `Segments` DROP FOREIGN KEY file_extension, DROP COLUMN file_extension', {
      type: queryInterface.sequelize.QueryTypes.RAW
    })
  }

}
