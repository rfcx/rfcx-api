'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.addColumn('classifier_jobs', 'minutes_total', { type: Sequelize.INTEGER, defaultValue: null, allowNull: true }, { transaction })
      await queryInterface.addColumn('classifier_jobs', 'minutes_completed', { type: Sequelize.INTEGER, defaultValue: 0, allowNull: false }, { transaction })
      await queryInterface.removeColumn('classifier_jobs', 'segments_total', { transaction })
      await queryInterface.removeColumn('classifier_jobs', 'segments_completed', { transaction })
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.addColumn('classifier_jobs', 'segments_total', { type: Sequelize.INTEGER, defaultValue: null, allowNull: true }, { transaction })
      await queryInterface.addColumn('classifier_jobs', 'segments_completed', { type: Sequelize.INTEGER, defaultValue: 0, allowNull: false }, { transaction })
      await queryInterface.removeColumn('classifier_jobs', 'minutes_total', { transaction })
      await queryInterface.removeColumn('classifier_jobs', 'minutes_completed', { transaction })
    })
  }
}
