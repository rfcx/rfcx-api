'use strict'
module.exports = {
  async up (queryInterface, Sequelize) {
    const t = await queryInterface.sequelize.transaction()
    try {
      await queryInterface.removeColumn('classifier_outputs', 'ignore', { transaction: t })
      await t.commit()
    } catch (err) {
      await t.rollback()
      throw err
    }
  },
  async down (queryInterface, Sequelize) {
    const t = await queryInterface.sequelize.transaction()
    try {
      await queryInterface.addColumn('classifier_outputs', 'ignore', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      }, { transaction: t })
      await t.commit()
    } catch (err) {
      await t.rollback()
      throw err
    }
  }
}
