'use strict'
module.exports = {
  up: async (queryInterface, Sequelize) => {
    return await queryInterface.addColumn(
      'classifier_jobs',
      'last_reviewed_by_id',
      {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: {
            tableName: 'users'
          },
          key: 'id'
        }
      }
    )
  },
  down: async (queryInterface, Sequelize) => {
    return await queryInterface.removeColumn('classifier_jobs', 'last_reviewed_by_id')
  }
}
