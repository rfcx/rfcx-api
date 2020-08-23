'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('classifications', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      value: {
        type: Sequelize.STRING(64),
        allowNull: false,
        unique: true
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT
      },
      image: {
        type: Sequelize.STRING
      },
      parent_id: {
        type: Sequelize.INTEGER,
        references: {
          model: {
            tableName: 'classifications'
          },
          key: 'id'
        }
      },
      type_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: {
            tableName: 'classification_types'
          },
          key: 'id'
        }
      },
      source_id: {
        type: Sequelize.INTEGER,
        references: {
          model: {
            tableName: 'classification_sources'
          },
          key: 'id'
        }
      },
      source_external_id: {
        type: Sequelize.INTEGER
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
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('classifications')
  }
}
