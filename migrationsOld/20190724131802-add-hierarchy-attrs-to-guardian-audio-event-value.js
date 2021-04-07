'use strict'

module.exports = {
  up: function (queryInterface, Sequelize, done) {
    const sqlAddColumnModel = 'ALTER TABLE `GuardianAudioEventValues`' +
      ' ADD COLUMN `high_level_key` INTEGER DEFAULT NULL' +
      ', ADD FOREIGN KEY (`high_level_key`) REFERENCES `GuardianAudioEventValueHighLevelKeys`(`id`)' +
      ' ON UPDATE CASCADE ON DELETE RESTRICT'

    queryInterface.sequelize.query(sqlAddColumnModel, {
      type: queryInterface.sequelize.QueryTypes.RAW
    })

    queryInterface.addColumn(
      'GuardianAudioEventValues',
      'low_level_key',
      {
        type: Sequelize.STRING,
        allowNull: true,
        unique: false
      }
    )

    done()
  },

  down: function (queryInterface, Sequelize, done) {
    queryInterface.removeColumn('GuardianAudioEventValues', 'high_level_key')
    queryInterface.removeColumn('GuardianAudioEventValues', 'low_level_key')

    done()
  }

}
