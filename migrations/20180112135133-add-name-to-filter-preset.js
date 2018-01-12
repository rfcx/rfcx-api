'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {

    return queryInterface.addColumn(
      'FilterPresets',
      'name',
      {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
        validate: {
        }
      }
    );

  },

  down: function (queryInterface, Sequelize) {

    return queryInterface.removeColumn('FilterPresets', 'name');

  }
};
