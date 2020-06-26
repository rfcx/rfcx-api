'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('segments', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        primaryKey: true
      },
      start: {
        // Hypertable key
        type: Sequelize.DATE(3),
        allowNull: false,
        primaryKey: true,
      },
      end: {
        type: Sequelize.DATE(3),
        allowNull: false,
      },
      sample_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      stream_id: {
        type: Sequelize.STRING(12),
        allowNull: false,
        references: {
          model: {
            tableName: 'streams'
          },
          key: 'id'
        },
      },
      master_segment_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: {
            tableName: 'master_segments'
          },
          key: 'id'
        },
      },
      file_extension_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: {
            tableName: 'file_extensions'
          },
          key: 'id'
        },
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
    })
    .then(() => {
      return queryInterface.addConstraint('segments', {
        type: 'CHECK',
        fields: ['sample_count'],
        where: {
          sample_count: {
            [Sequelize.Op.gt]: 0
          }
        }
      })
    })
    .then(() => {
      return queryInterface.sequelize.query('SELECT create_hypertable(\'segments\', \'start\')', {
        type: queryInterface.sequelize.QueryTypes.RAW
      })
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('segments')
  }
}
