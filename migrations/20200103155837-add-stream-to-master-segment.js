'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {

    return queryInterface.sequelize.query("ALTER TABLE `MasterSegments` ADD COLUMN `stream` INTEGER DEFAULT NULL, " +
      "ADD CONSTRAINT master_segment_stream FOREIGN KEY (`stream`) REFERENCES `Streams`(`id`) " +
      "ON UPDATE CASCADE ON DELETE RESTRICT", {
        type: queryInterface.sequelize.QueryTypes.RAW
      })

  },

  down: function (queryInterface, Sequelize) {

    return queryInterface.sequelize.query("ALTER TABLE `MasterSegments` DROP FOREIGN KEY master_segment_stream, DROP COLUMN stream", {
      type: queryInterface.sequelize.QueryTypes.RAW
    })

  }

};

