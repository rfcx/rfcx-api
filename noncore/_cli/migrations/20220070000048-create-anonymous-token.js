'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable('AnonymousTokens', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true
        },
        guid: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          unique: true
        },
        type: {
          type: Sequelize.STRING,
          allowNull: false
        },
        only_allow_access_to: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        created_by: {
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
      await queryInterface.addIndex('AnonymousTokens', ['guid'], { transaction })
      await queryInterface.addIndex('AnonymousTokens', ['auth_token_expires_at'], { transaction })
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('AnonymousTokens')
  }
}
