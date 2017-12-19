'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {

    return queryInterface.addColumn(
      'Reports',
      'distance',
      {
        type: Sequelize.INTEGER,
        validate: {
          isInt: true,
          min: 0,
          max: 100
        },
        allowNull: true
      }
    );

  },

  down: function (queryInterface, Sequelize) {

    return queryInterface.removeColumn('Reports', 'distance');

  }
};
