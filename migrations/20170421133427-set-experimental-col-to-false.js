'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {

    return queryInterface.sequelize.query('UPDATE AudioAnalysisModels SET experimental=false;');

  },

  down: function (queryInterface, Sequelize) {

    return queryInterface.sequelize.query('UPDATE AudioAnalysisModels SET experimental=true;');

  }
};
