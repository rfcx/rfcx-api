'use strict'
module.exports = {
  up: async (queryInterface, Sequelize) => {
    return await queryInterface.addColumn(
      'classifier_jobs',
      'classifier_id',
      {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: {
            tableName: 'classifiers'
          },
          key: 'id'
        }
      }
    )
  },
  down: async (queryInterface, Sequelize) => {
    return await queryInterface.removeColumn('classifier_jobs', 'classifier_id')
  }
}
