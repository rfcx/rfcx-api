'use strict'
module.export = {
  up: async (queryInterface, Sequelize) => {
    return await queryInterface.sequelize.query(
      'CREATE INDEX classifier_id_idx ON classifiers (id);'
    )
  },
  down: async (queryInterface, Sequelize) => {
    return await queryInterface.sequelize.quert(
      'DROP INDEX classifier_id_idx ON classifiers;'
    )
  }
}
