'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable('GuardianMetaSensorValues', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true
        },
        measured_at: {
          type: Sequelize.DATE(3),
          primaryKey: true
        },
        value: {
          type: Sequelize.FLOAT,
          allowNull: false
        },
        sensor_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: {
              tableName: 'GuardianMetaSensors'
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
      await queryInterface.sequelize.query("SELECT create_hypertable('\"GuardianMetaSensorValues\"', 'measured_at')", {
        type: queryInterface.sequelize.QueryTypes.RAW,
        transaction
      })
      await queryInterface.addIndex('GuardianMetaSensorValues', ['guardian_id', 'sensor_id'], { transaction })
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('GuardianMetaSensorValues')
  }
}
