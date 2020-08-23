'use strict'

module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface.sequelize.query('ALTER TABLE `MasterSegments` ADD COLUMN `channel_layout` INTEGER DEFAULT NULL, ' +
      'ADD CONSTRAINT channel_layout FOREIGN KEY (`channel_layout`) REFERENCES `ChannelLayouts`(`id`) ' +
      'ON UPDATE CASCADE ON DELETE RESTRICT', {
      type: queryInterface.sequelize.QueryTypes.RAW
    })
  },

  down: function (queryInterface, Sequelize) {
    return queryInterface.sequelize.query('ALTER TABLE `MasterSegments` DROP FOREIGN KEY channel_layout, DROP COLUMN channel_layout', {
      type: queryInterface.sequelize.QueryTypes.RAW
    })
  }

}
