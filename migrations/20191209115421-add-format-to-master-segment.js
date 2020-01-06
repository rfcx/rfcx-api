'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {

    return queryInterface.sequelize.query("ALTER TABLE `MasterSegments` ADD COLUMN `format` INTEGER DEFAULT NULL, " +
      "ADD CONSTRAINT master_segment_format FOREIGN KEY (`format`) REFERENCES `Formats`(`id`) " +
      "ON UPDATE CASCADE ON DELETE RESTRICT", {
        type: queryInterface.sequelize.QueryTypes.RAW
      })

  },

  down: function (queryInterface, Sequelize) {

    return queryInterface.sequelize.query("ALTER TABLE `MasterSegments` DROP FOREIGN KEY master_segment_format, DROP COLUMN format", {
      type: queryInterface.sequelize.QueryTypes.RAW
    })

  }

};

