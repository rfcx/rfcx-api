'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {

    return Promise.all([
      queryInterface.renameColumn('Classifications', 'source_id', 'source_external_id'),
    ])
  },

  down: function (queryInterface, Sequelize) {

    return Promise.all([
      queryInterface.renameColumn('Classifications', 'source_external_id', 'source_id'),
    ])
  }
};
