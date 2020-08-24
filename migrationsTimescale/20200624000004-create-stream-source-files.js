'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('stream_source_files', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        primaryKey: true
      },
      filename: {
        type: Sequelize.STRING,
        allowNull: false
      },
      duration: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      sample_count: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      sample_rate: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      channels_count: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      bit_rate: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      meta: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      sha1_checksum: {
        type: Sequelize.STRING,
        allowNull: true
      },
      stream_id: {
        type: Sequelize.STRING(12),
        allowNull: false,
        references: {
          model: {
            tableName: 'streams'
          },
          key: 'id'
        }
      },
      audio_codec_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: {
            tableName: 'audio_codecs'
          },
          key: 'id'
        }
      },
      audio_file_format_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: {
            tableName: 'audio_file_formats'
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
      .then(() => {
        return Promise.all([
          queryInterface.addConstraint('stream_source_files', {
            type: 'CHECK',
            fields: ['duration'],
            where: {
              duration: {
                [Sequelize.Op.gt]: 0
              }
            }
          }),
          queryInterface.addConstraint('stream_source_files', {
            type: 'CHECK',
            fields: ['sample_count'],
            where: {
              sample_count: {
                [Sequelize.Op.gt]: 0
              }
            }
          }),
          queryInterface.addConstraint('stream_source_files', {
            type: 'CHECK',
            fields: ['channels_count'],
            where: {
              channels_count: {
                [Sequelize.Op.gt]: 0
              }
            }
          }),
          queryInterface.addConstraint('stream_source_files', {
            type: 'CHECK',
            fields: ['sample_rate'],
            where: {
              sample_rate: {
                [Sequelize.Op.gt]: 0
              }
            }
          })
        ])
      })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('stream_source_files')
  }
}
