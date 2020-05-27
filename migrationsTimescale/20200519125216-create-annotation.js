'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.query('SELECT create_hypertable(\'annotations\', \'start\')', {
      type: queryInterface.sequelize.QueryTypes.RAW
    })
  },
  down: (queryInterface, Sequelize) => {
    return Promise.resolve()
  }
};