'use strict'
module.exports = {
  async up (queryInterface, Sequelize) {
    return queryInterface.addColumn(
      'classifier_outputs',
      'ignore_threshold',
      {
        type: Sequelize.FLOAT,
        allowNull: true,
        defaultValue: 0.5
      }
    )
  },
  async down (queryInterface, Sequelize) {
    return queryInterface.removeColumn('classifier_outputs', 'ignore_threshold', { transaction: t })
  }
}
