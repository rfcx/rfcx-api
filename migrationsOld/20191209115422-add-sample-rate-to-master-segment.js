'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {

    return queryInterface.sequelize.query("ALTER TABLE `MasterSegments` ADD COLUMN `sample_rate` INTEGER DEFAULT NULL, " +
      "ADD CONSTRAINT sample_rate FOREIGN KEY (`sample_rate`) REFERENCES `SampleRates`(`id`) " +
      "ON UPDATE CASCADE ON DELETE RESTRICT", {
        type: queryInterface.sequelize.QueryTypes.RAW
      })

  },

  down: function (queryInterface, Sequelize) {

    return queryInterface.sequelize.query("ALTER TABLE `MasterSegments` DROP FOREIGN KEY sample_rate, DROP COLUMN sample_rate", {
      type: queryInterface.sequelize.QueryTypes.RAW
    })

  }

};

