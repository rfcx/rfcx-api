'use strict'
module.exports = {
  async up (queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(t => {
      return Promise.all([
        queryInterface.removeColumn('classifier_outputs', 'ignore', { transaction: t }),
        queryInterface.addColumn('classifier_outputs', 'ignore_threshold',
          { type: Sequelize.FLOAT, allowNull: false, defaultValue: 0.5 }, { transaction: t }
        )
      ])
    })
  },
  async down (queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(t => {
      return Promise.all([
        queryInterface.removeColumn('classifier_outputs', 'ignore_threshold', { transaction: t }),
        queryInterface.addColumn('classifier_outputs', 'ignore',
          { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false }, { transaction: t }
        )
      ])
    })
  }
}
