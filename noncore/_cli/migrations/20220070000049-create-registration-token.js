'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable('RegistrationTokens', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true
        },
        guid: {
          type: Sequelize.STRING,
          allowNull: false,
          unique: true
        },
        type: {
          type: Sequelize.STRING,
          allowNull: false
        },
        only_allow_access_to: {
          type: Sequelize.TEXT,
          allowNull: false
        },
        allowed_redemptions: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 1
        },
        total_redemptions: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        created_by: {
          type: Sequelize.STRING,
          allowNull: true
        },
        created_for: {
          type: Sequelize.STRING,
          allowNull: true
        },
        auth_token_salt: {
          type: Sequelize.STRING,
          allowNull: true,
          unique: true
        },
        auth_token_hash: {
          type: Sequelize.STRING,
          allowNull: true,
          unique: true
        },
        auth_token_expires_at: {
          type: Sequelize.DATE(3),
          defaultValue: Sequelize.NOW
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
      await queryInterface.addIndex('RegistrationTokens', ['guid'], { transaction })
      await queryInterface.addIndex('RegistrationTokens', ['auth_token_expires_at'], { transaction })
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('RegistrationTokens')
  }
}
