'use strict'
module.export = {
  up: async (queryInterface, Sequelize) => {
    return await queryInterface.sequelize.query(
      'CREATE INDEX classifier_outputs_classifier_id_idx ON classifier_outputs (classifier_id);'
    )
  },
  down: async (queryInterface, Sequelize) => {
    return await queryInterface.sequelize.quert(
      'DROP INDEX classifier_outputs_classifier_id_idx ON classifier_outputs;'
    )
  }
}
