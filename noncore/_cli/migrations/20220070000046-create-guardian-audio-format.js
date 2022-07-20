'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable('GuardianAudioFormats', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true
        },
        codec: {
          type: Sequelize.STRING,
          allowNull: false,
          unique: false
        },
        mime: {
          type: Sequelize.STRING,
          allowNull: false,
          unique: false
        },
        file_extension: {
          type: Sequelize.STRING,
          allowNull: false,
          unique: false
        },
        sample_rate: {
          type: Sequelize.INTEGER,
          allowNull: false,
          unique: false
        },
        sample_size: {
          type: Sequelize.INTEGER,
          allowNull: false,
          unique: false,
          defaultValue: 0
        },
        channel_count: {
          type: Sequelize.INTEGER,
          allowNull: false,
          unique: false,
          defaultValue: 1
        },
        target_bit_rate: {
          type: Sequelize.INTEGER,
          allowNull: false,
          unique: false
        },
        is_vbr: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false
        }
      })
      await queryInterface.addIndex('GuardianAudioFormats', ['sample_rate'], { transaction })
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('GuardianAudioFormats')
  }
}
