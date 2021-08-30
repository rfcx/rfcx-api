'use strict'

module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.addColumn('Guardians', 'stream_id', { type: Sequelize.STRING(12), allowNull: true }, { transaction: t })
      const guardians = await queryInterface.sequelize.query('SELECT guid FROM Guardians', { type: Sequelize.QueryTypes.SELECT, transaction: t })
      for (const guardian of guardians) {
        await queryInterface.sequelize.query(`UPDATE Guardians SET stream_id='${guardian.guid}' WHERE guid='${guardian.guid}';`, { transaction: t })
      }
    })
  },

  down: function (queryInterface, Sequelize) {
    return queryInterface.removeColumn('Guardians', 'stream_id')
  }
}
