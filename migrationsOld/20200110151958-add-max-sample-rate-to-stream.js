'use strict'

module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface.sequelize.query('ALTER TABLE `Streams` ADD COLUMN `max_sample_rate` INTEGER DEFAULT NULL, ' +
      'ADD CONSTRAINT stream_max_sample_rate FOREIGN KEY (`max_sample_rate`) REFERENCES `SampleRates`(`id`) ' +
      'ON UPDATE CASCADE ON DELETE RESTRICT', {
      type: queryInterface.sequelize.QueryTypes.RAW
    })
  },

  down: function (queryInterface, Sequelize) {
    return queryInterface.sequelize.query('ALTER TABLE `Streams` DROP FOREIGN KEY max_sample_rate, DROP COLUMN max_sample_rate', {
      type: queryInterface.sequelize.QueryTypes.RAW
    })
  }

}
