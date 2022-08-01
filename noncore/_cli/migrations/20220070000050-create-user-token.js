'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable('UserTokens', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true
        },
        type: {
          type: Sequelize.STRING,
          allowNull: false
        },
        only_allow_access_to: {
          type: Sequelize.TEXT,
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
        user_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: {
              tableName: 'Users'
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
      })
      await queryInterface.addIndex('UserTokens', ['user_id'], { transaction })
      await queryInterface.addIndex('UserTokens', ['auth_token_expires_at'], { transaction })
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('UserTokens')
  }
}
