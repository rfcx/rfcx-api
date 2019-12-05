'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {

    return Promise.all([
      queryInterface.removeIndex('MasterSegments', 'MasterSegments_filename_unique'),
      queryInterface.removeIndex('MasterSegments', 'filename'),
    ])

  },

  down: function (queryInterface, Sequelize) {

    return queryInterface.sequelize.query('CREATE UNIQUE INDEX MasterSegments_filename_unique ON MasterSegments(filename);', {
      type: queryInterface.sequelize.QueryTypes.RAW
    });

  }
};
