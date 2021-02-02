'use strict'
module.exports = {
  async up (queryInterface, Sequelize) {
    const t = await queryInterface.sequelize.transaction()
    try {
      await queryInterface.removeColumn('events', 'first_detection_id', { transaction: t })
      await queryInterface.removeColumn('events', 'last_detection_id', { transaction: t })
      await t.commit()
    } catch (err) {
      await t.rollback()
      throw err
    }
  },
  async down (queryInterface, Sequelize) {
    const t = await queryInterface.sequelize.transaction()
    try {
      await queryInterface.addColumn('events', 'first_detection_id', {
        type: Sequelize.STRING,
        allowNull: false
      }, { transaction: t })
      await queryInterface.addColumn('events', 'last_detection_id', {
        type: Sequelize.STRING,
        allowNull: false
      }, { transaction: t })
      await t.commit()
    } catch (err) {
      await t.rollback()
      throw err
    }
  }
}
