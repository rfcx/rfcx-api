'use strict'

module.exports = {
  up: function (queryInterface, Sequelize, done) {
    var sqlAddColumnModel = 'ALTER TABLE `Reports`' +
    ' ADD COLUMN `value` INTEGER DEFAULT NULL' +
    ', ADD FOREIGN KEY (`value`) REFERENCES `GuardianAudioEventValues`(`id`)' +
    ' ON UPDATE CASCADE ON DELETE RESTRICT;'

    queryInterface.sequelize.query(sqlAddColumnModel, {
      type: queryInterface.sequelize.QueryTypes.RAW
    })

    queryInterface.changeColumn(
      'Reports',
      'guid',
      {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        unique: true
      }
    )

    queryInterface.removeColumn('Reports', 'start_time')
    queryInterface.removeColumn('Reports', 'end_time')

    queryInterface.addColumn(
      'Reports',
      'reported_at',
      {
        type: Sequelize.DATE,
        allowNull: false,
        validate: {
          isDate: true
        }
      }
    )

    queryInterface.removeColumn('Reports', 'type')

    queryInterface.addColumn(
      'Reports',
      'age_estimate',
      {
        type: Sequelize.INTEGER,
        validate: {
          isInt: true,
          min: {
            args: 0,
            msg: 'age_estimate should be equal or greater than 0'
          },
          max: {
            args: 30,
            msg: 'age_estimate should be equal or less than 30'
          }
        }
      }
    )

    queryInterface.changeColumn(
      'Reports',
      'lat',
      {
        type: Sequelize.FLOAT,
        allowNull: false,
        validate: {
          isFloat: true,
          min: -90,
          max: 90
        }
      }
    )

    queryInterface.changeColumn(
      'Reports',
      'long',
      {
        type: Sequelize.FLOAT,
        allowNull: false,
        validate: {
          isFloat: true,
          min: -180,
          max: 180
        }
      }
    )

    queryInterface.addColumn(
      'Reports',
      'audio',
      {
        type: Sequelize.STRING,
        allowNull: true,
        unique: false,
        validate: { }
      }
    )

    done()
  },

  down: function (queryInterface, Sequelize, done) {
    queryInterface.removeColumn('Reports', 'value')

    queryInterface.changeColumn(
      'Reports',
      'guid',
      {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        unique: true
      }
    )

    queryInterface.addColumn(
      'Reports',
      'start_time',
      {
        type: Sequelize.DATE
      }
    )

    queryInterface.addColumn(
      'Reports',
      'end_time',
      {
        type: Sequelize.DATE
      }
    )

    queryInterface.removeColumn('Reports', 'reported_at')

    queryInterface.addColumn(
      'Reports',
      'type',
      {
        type: Sequelize.STRING
      }
    )

    queryInterface.removeColumn('Reports', 'age_estimate')

    queryInterface.changeColumn(
      'Reports',
      'lat',
      {
        type: Sequelize.REAL
      }
    )

    queryInterface.changeColumn(
      'Reports',
      'long',
      {
        type: Sequelize.REAL
      }
    )

    queryInterface.removeColumn('Reports', 'audio')

    done()
  }
}
