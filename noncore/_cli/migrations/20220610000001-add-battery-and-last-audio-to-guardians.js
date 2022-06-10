'use strict'

module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async transaction => {
      const lastAudioSyncExists = await queryInterface.sequelize.query('SELECT 1 FROM information_schema.COLUMNS WHERE table_name = \'Guardians\' AND column_name = \'last_audio_sync\' AND table_schema = \'rfcx_api\'', { plain: true, transaction })
      if (!lastAudioSyncExists) {
        await queryInterface.addColumn('Guardians', 'last_audio_sync', { type: Sequelize.DATE(3), allowNull: true, defaultValue: null }, { transaction })
      }

      const lastBatteryMainExists = await queryInterface.sequelize.query('SELECT 1 FROM information_schema.COLUMNS WHERE table_name = \'Guardians\' AND column_name = \'last_battery_main\' AND table_schema = \'rfcx_api\'', { plain: true, transaction })
      if (!lastBatteryMainExists) {
        await queryInterface.addColumn('Guardians', 'last_battery_main', { type: Sequelize.INTEGER, allowNull: true, defaultValue: null }, { transaction })
      }

      const lastBatteryInternalExists = await queryInterface.sequelize.query('SELECT 1 FROM information_schema.COLUMNS WHERE table_name = \'Guardians\' AND column_name = \'last_battery_internal\' AND table_schema = \'rfcx_api\'', { plain: true, transaction })
      if (!lastBatteryInternalExists) {
        await queryInterface.addColumn('Guardians', 'last_battery_internal', { type: Sequelize.INTEGER, allowNull: true, defaultValue: null }, { transaction })
      }
    })
  },

  down: function (queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.removeColumn('Guardians', 'last_audio_sync', { transaction })
      await queryInterface.removeColumn('Guardians', 'last_battery_main', { transaction })
      await queryInterface.removeColumn('Guardians', 'last_battery_internal', { transaction })
    })
  }
}
