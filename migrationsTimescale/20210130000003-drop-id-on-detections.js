'use strict'
module.exports = {
  async up (queryInterface, Sequelize) {
    const t = await queryInterface.sequelize.transaction()
    try {
      await queryInterface.sequelize.query('ALTER TABLE public.detections DROP CONSTRAINT detections_pkey', {
        type: queryInterface.sequelize.QueryTypes.RAW,
        transaction: t
      })
      await queryInterface.removeColumn('detections', 'id', { transaction: t })
      await t.commit()
    } catch (err) {
      await t.rollback()
      throw err
    }
  },
  async down (queryInterface, Sequelize) {
    const t = await queryInterface.sequelize.transaction()
    try {
      await queryInterface.addColumn('detections', 'id', {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false
      }, { transaction: t })
      await queryInterface.sequelize.query('ALTER TABLE public.detections ADD CONSTRAINT detections_pkey PRIMARY KEY (id, start)', {
        type: queryInterface.sequelize.QueryTypes.RAW,
        transaction: t
      })
      await t.commit()
    } catch (err) {
      await t.rollback()
      throw err
    }
  }
}
