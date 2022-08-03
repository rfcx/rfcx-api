'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable('GuardianMetaBattery', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true
        },
        measured_at: {
          type: Sequelize.DATE(3),
          primaryKey: true
        },
        battery_percent: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        battery_temperature: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        is_charging: {
          type: Sequelize.BOOLEAN,
          defaultValue: false,
          allowNull: true
        },
        is_fully_charged: {
          type: Sequelize.BOOLEAN,
          defaultValue: false,
          allowNull: true
        },
        check_in_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: {
              tableName: 'GuardianCheckIns'
            },
            key: 'id'
          }
        },
        guardian_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: {
              tableName: 'Guardians'
            },
            key: 'id'
          }
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false
        }
      }, { transaction })
      await queryInterface.sequelize.query("SELECT create_hypertable('\"GuardianMetaBattery\"', 'measured_at')", {
        type: queryInterface.sequelize.QueryTypes.RAW,
        transaction
      })
      await queryInterface.addIndex('GuardianMetaBattery', ['guardian_id'], { transaction })
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('GuardianMetaBattery')
  }
}
