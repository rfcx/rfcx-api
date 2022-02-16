'use strict'
module.exports = {
  up: async (queryInterface, Sequelize) => {
    return await queryInterface.sequelize.query(
      'CREATE INDEX classifier_outputs_classifier_id_idx ON classifier_outputs (classifier_id);'
    )
  },
  down: async (queryInterface, Sequelize) => {
    return await queryInterface.sequelize.query(
      'DROP INDEX classifier_outputs_classifier_id_idx ON classifier_outputs;'
    )
  }
}
