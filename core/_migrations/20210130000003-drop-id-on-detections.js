'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.sequelize.query('ALTER TABLE public.detections DROP CONSTRAINT detections_pkey', {
        type: queryInterface.sequelize.QueryTypes.RAW,
        transaction: t
      })
      await queryInterface.removeColumn('detections', 'id', { transaction: t })
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.addColumn('detections', 'id', {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false
      }, { transaction: t })
      await queryInterface.sequelize.query('ALTER TABLE detections ADD CONSTRAINT detections_pkey PRIMARY KEY (id, start)', {
        type: queryInterface.sequelize.QueryTypes.RAW,
        transaction: t
      })
    })
  }
}
