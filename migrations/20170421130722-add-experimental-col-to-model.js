'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {

    return queryInterface.addColumn(
      'AudioAnalysisModels',
      'experimental',
      {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      }
    );

  },

  down: function (queryInterface, Sequelize) {

    return queryInterface.removeColumn('AudioAnalysisModels', 'experimental');

  }
};
