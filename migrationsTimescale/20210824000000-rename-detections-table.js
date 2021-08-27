'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.renameTable('detections', 'detections_old')
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.renameTable('detections_old', 'detections')
  }
}
