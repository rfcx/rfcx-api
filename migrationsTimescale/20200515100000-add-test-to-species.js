'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {

    return Promise.all([
      queryInterface.addColumn(
        'SpeciesNames',
        'test',
        {
          type: Sequelize.BOOLEAN,
          defaultValue: false,
          allowNull: true,
        }
      )
    ])
  },

  down: function (queryInterface, Sequelize) {

    return Promise.all([
      queryInterface.removeColumn('SpeciesNames', 'test'),
    ])
  }
};
