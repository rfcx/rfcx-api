'use strict'

module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface.sequelize.query('ALTER TABLE `MasterSegments` ADD COLUMN `codec` INTEGER DEFAULT NULL, ' +
      'ADD CONSTRAINT codec FOREIGN KEY (`codec`) REFERENCES `Codecs`(`id`) ' +
      'ON UPDATE CASCADE ON DELETE RESTRICT', {
      type: queryInterface.sequelize.QueryTypes.RAW
    })
  },

  down: function (queryInterface, Sequelize) {
    return queryInterface.sequelize.query('ALTER TABLE `MasterSegments` DROP FOREIGN KEY codec, DROP COLUMN codec', {
      type: queryInterface.sequelize.QueryTypes.RAW
    })
  }

}
