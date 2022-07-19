'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable('GuardianMetaSentinelPower', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true
        },
        measured_at: {
          type: Sequelize.DATE(3),
          primaryKey: true
        },
        system_temperature: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        system_voltage: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        system_current: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        system_power: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        input_voltage: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        input_current: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        input_power: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        battery_state_of_charge: {
          type: Sequelize.DOUBLE,
          allowNull: true
        },
        battery_voltage: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        battery_current: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        battery_power: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        check_in_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
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
      await queryInterface.sequelize.query("SELECT create_hypertable('\"GuardianMetaSentinelPower\"', 'measured_at')", {
        type: queryInterface.sequelize.QueryTypes.RAW,
        transaction
      })
      await queryInterface.addIndex('GuardianMetaSentinelPower', ['guardian_id'], { transaction })
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('GuardianMetaSentinelPower')
  }
}
