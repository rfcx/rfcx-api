'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {

    return queryInterface.addColumn(
      'MasterSegments',
      'meta',
      {
        type: Sequelize.TEXT('long'),
        allowNull: true,
      }
    );

  },

  down: function (queryInterface, Sequelize) {

    return queryInterface.removeColumn('MasterSegments', 'meta');

  }
};
