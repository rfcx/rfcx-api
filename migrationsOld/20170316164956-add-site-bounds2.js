'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {

    return queryInterface.addColumn(
      'GuardianSites',
      'bounds',
      {
        type: Sequelize.GEOMETRY,
        allowNull: true,
        validate: {
        }
      }
    );
  },

  down: function (queryInterface, Sequelize) {

    return queryInterface.removeColumn('GuardianSites', 'bounds');

  }
};
